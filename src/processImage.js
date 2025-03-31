const fs = require('fs');

const [,, inputPath, outputPath, index, total] = process.argv;

fs.copyFile(inputPath, outputPath, (err) => {
  if (err) {
    console.error(`Copy error: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
});