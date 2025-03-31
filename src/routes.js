const { spawn } = require('child_process');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const { ensureDir } = require('./utils');
const config = require('./config');

const downloadTokens = new Map();

module.exports = (io) => {
  const router = require('express').Router();
  const originalUploadsDir = path.join(__dirname, '../storage/original_uploads');
  const previewsDir = path.join(__dirname, '../storage/previews');
  const logsDir = path.join(__dirname, '../storage/logs');
  const logFile = path.join(logsDir, 'logs.txt');
  const watermarkPath = path.join(__dirname, '../public/images/imageflow_sign.png');

  (async () => {
    try {
      await ensureDir(originalUploadsDir);
      await ensureDir(previewsDir);
      await ensureDir(logsDir);
      if (!await fs.access(logFile).catch(() => false)) {
        await fs.writeFile(logFile, '', 'utf8');
      }
    } catch (err) {
      console.error('Initialization failed:', err);
    }
  })();

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  const logAction = async (req, action, imageLink = '') => {
    const date = formatDate(new Date());
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown device';
    const device = userAgent.includes('Windows') ? 'computer Windows' :
                   userAgent.includes('Mac') ? 'computer macOS' :
                   userAgent.includes('Android') ? 'Android' :
                   userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' : 'unknown device';
    const logEntry = `${date} | IP: ${ip} | Device: ${device} | Action: ${action}${imageLink ? ` | Image: ${imageLink}` : ''}\n`;
    try {
      await fs.appendFile(logFile, logEntry, 'utf8');
    } catch (err) {
      console.error('Log write failed:', err);
    }
  };

  const cleanupOldData = async () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    try {
      const files = (await fs.readdir(originalUploadsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      for (const file of files) {
        const filePath = path.join(originalUploadsDir, file);
        const stats = await fs.stat(filePath).catch(() => null);
        if (stats && stats.mtime < oneMonthAgo) {
          await fs.unlink(filePath).catch(err => console.error('Delete failed:', err));
          await fs.unlink(path.join(previewsDir, file)).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  };

  const generatePreview = async (inputPath, outputPath) => {
    const previewSize = 300;
    const resizedImage = sharp(inputPath).resize({ width: previewSize, height: previewSize, fit: 'inside' });
    const resizedBuffer = await resizedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const previewWidth = resizedMeta.width;
    const previewHeight = resizedMeta.height;

    const watermarkWidth = Math.round(previewWidth * 0.4);
    const watermarkMaxHeight = Math.round(previewHeight * 0.4);

    const watermarkBuffer = await sharp(watermarkPath)
      .resize({ width: watermarkWidth, height: watermarkMaxHeight, fit: 'inside' })
      .toBuffer();

    await sharp(resizedBuffer)
      .composite([{ input: watermarkBuffer, gravity: 'southwest', blend: 'over' }])
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  };

  router.post('/upload', async (req, res) => {
    if (config.env === 'prod') return res.status(400).json({ error: 'Use Vercel for prod.' });

    const form = new formidable.IncomingForm({
      uploadDir: originalUploadsDir,
      keepExtensions: true,
      maxFileSize: config.maxFileSize,
      maxTotalFileSize: config.maxTotalFileSize,
      maxFiles: config.maxFiles,
      multiples: true,
      filter: ({ mimetype }) => mimetype && mimetype.startsWith('image/')
    });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: `Upload failed: ${err.message}` });

      const uploadedFiles = Array.isArray(files.image) ? files.image : [files.image];
      const socketId = fields.socketId;

      if (!uploadedFiles || !uploadedFiles.length || uploadedFiles.some(f => !f.size)) {
        return res.status(400).json({ error: 'No valid images uploaded.' });
      }

      const invalidFiles = uploadedFiles.filter(file => !config.allowedExtensions.includes(path.extname(file.originalFilename || '').toLowerCase()));
      if (invalidFiles.length > 0) {
        return res.status(400).json({ error: `Only ${config.allowedExtensions.join(', ')} files allowed.` });
      }

      const sanitizeFileName = (filename) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const results = [];

      const processImage = async (file, index, total) => {
        const randomString = crypto.randomBytes(8).toString('hex');
        const sanitizedName = sanitizeFileName(path.basename(file.originalFilename, path.extname(file.originalFilename)));
        const fileName = `upload_${index}_${randomString}_${sanitizedName}${path.extname(file.originalFilename)}`;
        const originalPath = path.join(originalUploadsDir, fileName);
        const previewPath = path.join(previewsDir, fileName);
        const link = `/previews/${fileName}`;
        const pictureId = randomString;

        // Strip metadata and save the original image
        await sharp(file.filepath || file.path)
          .withMetadata(false) // Remove metadata
          .toFile(originalPath);
        await fs.unlink(file.filepath || file.path); // Remove temp file
        await generatePreview(originalPath, previewPath);

        io.to(socketId).emit('processing-update', { message: `Uploaded image ${index}/${total}` });
        results.push({ link, pictureId });
      };

      try {
        await cleanupOldData();
        io.to(socketId).emit('processing-update', { message: 'Starting image upload...' });
        for (let i = 0; i < uploadedFiles.length; i++) {
          await processImage(uploadedFiles[i], i + 1, uploadedFiles.length);
        }
        for (const result of results) {
          await logAction(req, 'Uploaded', `/pictures/${result.pictureId}`);
        }
        io.to(socketId).emit('processing-complete', { results });
        res.status(200).json({ results });
      } catch (error) {
        io.to(socketId).emit('processing-error', { message: `Error: ${error.message}` });
        res.status(500).json({ error: `Processing failed: ${error.message}` });
      }
    });
  });

  router.get('/images', async (req, res) => {
    try {
      const files = (await fs.readdir(previewsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      const images = files.map(f => ({
        link: `/previews/${f}`,
        pictureId: f.split('_')[2]
      }));
      res.status(200).json({ images });
    } catch (error) {
      console.error('Failed to fetch images:', error);
      res.status(500).json({ error: `Failed to fetch images: ${error.message}` });
    }
  });

  router.delete('/images/:file', async (req, res) => {
    try {
      const originalPath = path.join(originalUploadsDir, req.params.file);
      const previewPath = path.join(previewsDir, req.params.file);
      const imageLink = `/pictures/${req.params.file.split('_')[2]}`;

      await fs.unlink(originalPath);
      await fs.unlink(previewPath).catch(() => {});

      await logAction(req, 'Deleted', imageLink);
      res.status(200).json({ message: `Deleted ${req.params.file}` });
    } catch (error) {
      res.status(500).json({ error: `Failed to delete image: ${error.message}` });
    }
  });

  router.delete('/images', async (req, res) => {
    try {
      const files = (await fs.readdir(originalUploadsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      if (!files.length) return res.status(200).json({ message: 'No images to delete' });

      for (const file of files) {
        await fs.unlink(path.join(originalUploadsDir, file));
        await fs.unlink(path.join(previewsDir, file)).catch(() => {});
      }

      await logAction(req, 'Deleted All');
      res.status(200).json({ message: 'All images deleted' });
    } catch (error) {
      res.status(500).json({ error: `Failed to delete all images: ${error.message}` });
    }
  });

  router.get('/api/logs', async (req, res) => {
    try {
      const logContent = await fs.readFile(logFile, 'utf8').catch(() => '');
      const lines = logContent.split('\n').filter(line => line.trim());
      const logs = lines.map(line => {
        const parts = line.split(' | Image: ');
        const logText = parts[0].split(' | ');
        const imageLink = parts[1] || '';
        return {
          date: logText[0],
          ip: logText[1].split(': ')[1],
          device: logText[2].split(': ')[1],
          action: logText[3].split(': ')[1],
          imageLink
        };
      }).reverse();
      res.status(200).json(logs.length ? logs : []);
    } catch (error) {
      res.status(200).json([]);
    }
  });

  router.get('/api/picture/:pictureId', async (req, res) => {
    try {
      const { pictureId } = req.params;
      const files = (await fs.readdir(originalUploadsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      const file = files.find(f => f.includes(`_${pictureId}_`));
      if (!file) return res.status(404).json({ error: 'Image not found' });

      const logContent = await fs.readFile(logFile, 'utf8').catch(() => '');
      const logs = logContent.split('\n')
        .filter(line => line.includes(`/pictures/${pictureId}`))
        .map(line => {
          const parts = line.split(' | ');
          return {
            date: parts[0],
            ip: parts[1].split(': ')[1],
            device: parts[2].split(': ')[1],
            action: parts[3].split(': ')[1]
          };
        });

      res.status(200).json({
        preview: `/previews/${file}`,
        logs,
        fileName: file
      });
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch picture details: ${error.message}` });
    }
  });

  const getDownloadLink = (fileName) => {
    const token = crypto.randomBytes(64).toString('hex');
    const filePath = path.join(originalUploadsDir, fileName);
    const expiry = Date.now() + config.downloadTokenExpiry;

    downloadTokens.set(token, { filePath, expiry });
    setTimeout(() => downloadTokens.delete(token), config.downloadTokenExpiry);

    return `/download/${token}`;
  };

  router.post('/api/download/:pictureId', async (req, res) => {
    const { pictureId } = req.params;
    const files = (await fs.readdir(originalUploadsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
    const file = files.find(f => f.includes(`_${pictureId}_`));
    if (!file) return res.status(404).json({ error: 'Image not found' });

    const downloadLink = getDownloadLink(file);
    res.status(200).json({ downloadLink });
  });

  return { router, logAction, getDownloadLink, downloadTokens };
};