const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const routesModule = require('./routes');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Validate required environment variables
const requiredVars = ['username', 'password', 'sessionSecret'];
const missingVars = requiredVars.filter(varName => !config[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Session middleware
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'prod', // Secure only in prod
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Initialize routes with io
const routesInstance = routesModule(io);
const { router: routes, logAction, getDownloadLink, downloadTokens } = routesInstance;

// Rate limiter for login
const loginRateLimiter = rateLimit({
  windowMs: config.loginRateLimitWindowMs,
  max: config.loginRateLimitMax,
  handler: async (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    await logAction(req, 'Rate Limit Exceeded');
    res.status(429).sendFile(path.join(__dirname, '../public/pages/429.html'));
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Serve static files for unauthenticated users
const publicUnauthenticatedPaths = [
  '/styles/general.css',
  '/styles/login.css',
  '/styles/error.css',
  '/styles/picture-detail.css',
  '/scripts/login.js',
  '/pages/403.html',
  '/pages/404.html',
  '/pages/429.html',
  '/pages/500.html',
  '/pages/login.html',
  '/pages/image-not-found.html',
];

app.use((req, res, next) => {
  if (publicUnauthenticatedPaths.some(p => req.path === p)) {
    return express.static(path.join(__dirname, '../public'))(req, res, next);
  }
  next();
});

app.use('/login', loginRateLimiter);

app.get('/login', (req, res) => {
  if (req.session.isAuthenticated) return res.redirect('/home');
  res.sendFile(path.join(__dirname, '../public/pages/login.html'));
});

app.post('/login', express.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.redirect('/login?error=missing');
  if (username !== config.username) return res.redirect('/login?error=invalid');

  try {
    const match = await bcrypt.compare(password, config.password);
    if (match) {
      req.session.isAuthenticated = true;
      await logAction(req, 'Login');
      res.redirect('/home');
    } else {
      res.redirect('/login?error=invalid');
    }
  } catch (err) {
    res.redirect('/login?error=server');
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) return next();
  if (req.path.startsWith('/api/') || ['/upload', '/previews', '/download', '/socket.io'].includes(req.path.split('/')[1])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/login');
};

app.use(isAuthenticated, express.static(path.join(__dirname, '../public')));
app.use('/previews', isAuthenticated, express.static(path.join(__dirname, '../storage/previews')));

app.use('/', isAuthenticated, routes);

// Download route with token
app.get('/download/:token', async (req, res) => {
  const { token } = req.params;
  const tokenData = downloadTokens.get(token);

  if (!tokenData || Date.now() > tokenData.expiry) {
    downloadTokens.delete(token);
    return res.status(404).sendFile(path.join(__dirname, '../public/pages/404.html'));
  }

  const filePath = tokenData.filePath;
  res.download(filePath, path.basename(filePath), (err) => {
    if (err) console.error('Download error:', err);
  });
});

app.get('/', isAuthenticated, (req, res) => res.redirect('/home'));
app.get('/home', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public/pages/home.html')));
app.get('/pictures', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public/pages/pictures.html')));
app.get('/logs', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public/pages/logs.html')));
app.get('/pictures/:pictureId', isAuthenticated, async (req, res) => {
    const { pictureId } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const previewsDir = path.join(__dirname, '../storage/previews');
    
    try {
      const files = (await fs.readdir(previewsDir)).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      const fileExists = files.some(f => f.includes(`_${pictureId}_`));
      if (!fileExists) {
        return res.status(404).sendFile(path.join(__dirname, '../public/pages/image-not-found.html'));
      }
      res.sendFile(path.join(__dirname, '../public/pages/picture-detail.html'));
    } catch (error) {
      console.error('Error checking picture existence:', error);
      res.status(500).sendFile(path.join(__dirname, '../public/pages/500.html'));
    }
  });

// Explicit logout route
app.get('/logout', isAuthenticated, async (req, res) => {
  await logAction(req, 'Logout');
  req.session.destroy((err) => {
    if (err) console.error('Session destroy failed:', err);
    res.redirect('/login');
  });
});

app.get('/403', (req, res) => res.status(403).sendFile(path.join(__dirname, '../public/pages/403.html')));
app.get('/404', (req, res) => res.status(404).sendFile(path.join(__dirname, '../public/pages/404.html')));
app.get('/429', (req, res) => res.status(429).sendFile(path.join(__dirname, '../public/pages/429.html')));
app.get('/500', (req, res) => res.status(500).sendFile(path.join(__dirname, '../public/pages/500.html')));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '../public/pages/404.html')));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).sendFile(path.join(__dirname, '../public/pages/500.html'));
});

if (config.env === 'dev') {
  server.listen(config.port, () => {
    console.log(`ImageFlow running in dev mode on http://localhost:${config.port}`);
  });
} else {
  console.log('Set ENV=dev to run locally. For prod, deploy to Vercel.');
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.stack));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));