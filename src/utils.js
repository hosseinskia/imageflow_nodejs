const fs = require('fs').promises;

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error('Failed to create directory:', err);
  }
}

module.exports = { ensureDir };