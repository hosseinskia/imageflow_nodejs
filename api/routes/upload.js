const { IncomingForm } = require('formidable');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const allowedExtensions = process.env.IMAGEFLOW_ALLOWED_EXTENSIONS.split(',');

  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: parseInt(process.env.IMAGEFLOW_MAX_FILE_SIZE, 10),
    maxTotalFileSize: parseInt(process.env.IMAGEFLOW_MAX_TOTAL_FILE_SIZE, 10),
  });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const uploadedFile = files.image?.[0] || files.image;
    const imageCount = parseInt(fields.imageCount, 10);

    if (!uploadedFile || !uploadedFile.size || isNaN(imageCount) || imageCount < 1 || imageCount > parseInt(process.env.IMAGEFLOW_MAX_FILES, 10)) {
      return res.status(400).json({ error: 'Invalid input!' });
    }

    const ext = path.extname(uploadedFile.originalFilename || '').toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: `Only ${allowedExtensions.join(', ')} files are allowed.` });
    }

    const inputImagePath = uploadedFile.filepath || uploadedFile.path;
    const imagesDir = '/tmp/images';
    await fs.mkdir(imagesDir, { recursive: true });
    const results = [{ message: 'Starting image processing...' }];

    const processImage = (i) => {
      return new Promise((resolve, reject) => {
        const randomString = crypto.randomBytes(8).toString('hex');
        const fileName = `version_${i}_${randomString}.jpg`;
        const outputFilePath = path.join(imagesDir, fileName);

        const child = spawn('node', ['-e', `
          const sharp = require('sharp');
          const fs = require('fs').promises;
          sharp('${inputImagePath}')
            .resize(${500 + i * 2})
            .rotate(${i * 3.6})
            .jpeg({ quality: 80 })
            .toFile('${outputFilePath}')
            .then(async () => {
              const buffer = await fs.readFile('${outputFilePath}');
              process.send({ link: '${fileName}', preview: 'data:image/jpeg;base64,' + buffer.toString('base64'), message: 'Processed image ${i}/${imageCount}' });
            })
            .catch(err => process.send({ error: err.message }));
        `]);

        child.on('message', (data) => {
          if (data.error) reject(new Error(data.error));
          else {
            results.push(data);
            resolve();
          }
        });

        child.on('error', reject);
        child.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Subprocess exited with code ${code}`));
        });
      });
    };

    for (let i = 1; i <= imageCount; i++) {
      await processImage(i);
    }

    await fs.rm(imagesDir, { recursive: true, force: true });
    await fs.unlink(inputImagePath).catch(err => console.error('Cleanup failed:', err));
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ error: `Processing failed: ${error.message}` });
  }
};