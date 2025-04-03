const { exiftool } = require('exiftool-vendored');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const formatDateForMetadata = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const addCustomMetadata = async (filePath) => {
  const now = new Date();
  const dateTime = formatDateForMetadata(now);
  const FullYear = now.getFullYear()
  const metadata = {
    Title: 'ImageFlow Processed Image',
    Author: 'ImageFlow',
    Description: `Processed by ImageFlow on ${dateTime}`,
    Copyright: `© ${FullYear} ImageFlow`,
    Keywords: 'ImageFlow',
    Software: 'ImageFlow (https://github.com/hosseinskia/imageflow_nodejs)'
  };

  try {
    await exiftool.write(filePath, metadata);
  } catch (err) {
    console.error(`Failed to add metadata to ${filePath}:`, err);
    throw err;
  }
};

const addCustomMetadataToBuffer = async (imageBuffer, ext) => {
  const now = new Date();
  const dateTime = formatDateForMetadata(now);
  const FullYear = now.getFullYear()
  const metadata = {
    Title: 'ImageFlow Processed Image',
    Author: 'ImageFlow',
    Description: `Processed by ImageFlow on ${dateTime}`,
    Copyright: `© ${FullYear} ImageFlow`,
    Keywords: 'ImageFlow',
    Software: 'ImageFlow (https://github.com/hosseinskia/imageflow_nodejs)'
  };

  // Create a temporary file to write the image buffer
  const tempFilePath = path.join(os.tmpdir(), `imageflow_temp_${Date.now()}${ext}`);
  try {
    // Write the buffer to a temporary file
    if (ext === '.png') {
      await sharp(imageBuffer)
        .png({ compressionLevel: 9 })
        .toFile(tempFilePath);
    } else {
      await sharp(imageBuffer)
        .jpeg({ quality: 100 })
        .toFile(tempFilePath);
    }

    // Add metadata to the temporary file
    await exiftool.write(tempFilePath, metadata);

    // Read the file back into a buffer
    const updatedBuffer = await fs.readFile(tempFilePath);
    return updatedBuffer;
  } catch (err) {
    console.error(`Failed to add metadata to buffer:`, err);
    throw err;
  } finally {
    // Clean up the temporary file
    await fs.unlink(tempFilePath).catch(() => {});
  }
};

module.exports = {
  formatDateForMetadata,
  addCustomMetadata,
  addCustomMetadataToBuffer
};