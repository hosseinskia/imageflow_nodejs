require('dotenv').config({ debug: true });

const config = {
  env: process.env.IMAGEFLOW_ENV,
  host: process.env.IMAGEFLOW_HOST,
  port: parseInt(process.env.IMAGEFLOW_PORT, 10),
  username: process.env.IMAGEFLOW_USERNAME,
  password: process.env.IMAGEFLOW_PASSWORD,
  sessionSecret: process.env.IMAGEFLOW_SESSION_SECRET,
  maxFileSize: parseInt(process.env.IMAGEFLOW_MAX_FILE_SIZE, 10),
  maxTotalFileSize: parseInt(process.env.IMAGEFLOW_MAX_TOTAL_FILE_SIZE, 10),
  maxFiles: parseInt(process.env.IMAGEFLOW_MAX_FILES, 10),
  allowedExtensions: process.env.IMAGEFLOW_ALLOWED_EXTENSIONS.split(','),
  loginRateLimitMax: parseInt(process.env.IMAGEFLOW_LOGIN_RATE_LIMIT_MAX, 10),
  loginRateLimitWindowMs: parseInt(process.env.IMAGEFLOW_LOGIN_RATE_LIMIT_WINDOW_MS, 10),
  downloadTokenExpiry: parseInt(process.env.IMAGEFLOW_DOWNLOAD_TOKEN_EXPIRY, 10),
};

// Validate all required variables
Object.entries(config).forEach(([key, value]) => {
  if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
    throw new Error(`Missing or invalid required environment variable: IMAGEFLOW_${key.toUpperCase()}`);
  }
});

module.exports = config;