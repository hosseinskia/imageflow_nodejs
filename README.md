# ImageFlow README


## Overview

ImageFlow is a web application designed for uploading, managing, and viewing images, emphasizing user authentication, logging, and secure file handling. Built with Node.js, Express, and Socket.IO, it supports local development fully, while production deployment on Vercel requires significant modifications. The app allows users to upload images, view watermarked previews, download originals, and track actions via logs..


## License
**GPL-3.0 © Amir Hossein Kia**


## Features

- **Image Upload:** Upload up to 1000 images (max 10MB each, 100MB total) in `.jpg`, `.jpeg`, or `.png` formats.
- **Authentication:** Secure login with rate limiting (10 attempts per minute).
- **Previews:** Automatically generated watermarked previews (300x300px).
- **Download:** Secure, token-based downloads with a 1-hour expiry.
- **Logging:** Detailed action logs (e.g., uploads, deletions) with IP and device info.
- **Image Management:** View all images, delete individually or all at once.
- **Error Handling:** Custom pages for `403`, `404`, `429`, `500`, and `Image Not Found` errors.

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML, CSS, JavaScript

### Dependencies

- bcrypt (password hashing)
- formidable (file uploads)
- sharp (image processing)
- express-session (session management)
- express-rate-limit (rate limiting)
- dotenv (environment variables)

### Deployment

- **Local**: Fully functional with Nodemon for development.
- **Vercel**: Limited to ```/upload``` endpoint; full functionality requires replacing local storage, Socket.IO, and text-based logs with production-ready alternatives (see below).

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/hosseinskia/imageflow_nodejs.git
cd imageflow_nodejs
```


### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Copy .env.example to .env and configure the file as follows:

```bash
# Environment (e.g., dev for local, prod for Vercel)
IMAGEFLOW_ENV=dev

# Port for local server
IMAGEFLOW_PORT=3000

# Username for login
IMAGEFLOW_USERNAME=admin

# Hashed password (generate with bcrypt)
IMAGEFLOW_PASSWORD=$2a$12$yourhashedpasswordhere

# Secret for session management
IMAGEFLOW_SESSION_SECRET=your-random-secret

# Max size per file (bytes, e.g., 10MB)
IMAGEFLOW_MAX_FILE_SIZE=10485760

# Max total size for all files (bytes, e.g., 100MB)
IMAGEFLOW_MAX_TOTAL_FILE_SIZE=104857600

# Max number of files per upload
IMAGEFLOW_MAX_FILES=1000

# Allowed file extensions
IMAGEFLOW_ALLOWED_EXTENSIONS=.jpg,.jpeg,.png

# Max login attempts per window
IMAGEFLOW_LOGIN_RATE_LIMIT_MAX=10

# Login rate limit window (ms, e.g., 1 minute)
IMAGEFLOW_LOGIN_RATE_LIMIT_WINDOW_MS=60000

# Download token expiry (ms, e.g., 1 hour)
IMAGEFLOW_DOWNLOAD_TOKEN_EXPIRY=3600000

```
Generate a hashed password using bcrypt:
```bash
const bcrypt = require('bcrypt');
bcrypt.hash('your-password', 12).then(hash => console.log(hash));
```
### 4. Running Locally
```bash
npm run dev
```
- Uses **nodemon** for auto-restart on changes.
- Runs at  ```http://localhost:3000```.
- Access via ```http://localhost:3000``` with your credentials.

## Deploying to Vercel
### 1. Install Vercel CLI
```
npm install -g vercel
```
### 2. Run Locally with Vercel Environment
```
npm run vercel-dev
```
### 3. Deploy to Production
```
npm run deploy
```

- Set ```.env``` variables in Vercel’s dashboard.
- **Important Note**: The app does not fully work on Vercel as-is. The current implementation relies on:

    - Local Image Storage: Uses ```storage/``` directories, which are not persistent on Vercel’s serverless environment. Replace with a cloud storage service like Cloudinary.

    - Socket.IO: Real-time updates won’t work on Vercel’s stateless functions. Replace with a polling mechanism or a WebSocket service like Pusher.

- Until these replacements are implemented, only the ```/upload``` endpoint (via ```api/routes/upload.js```) is functional on Vercel, with temporary ```/tmp``` storage.

# Usage
- **Login**: Use ```/login``` with your credentials.

- **Upload**: From ```/home```, upload images and see real-time updates via Socket.IO (local only).

- **Pictures**: View all images at ```/pictures```, delete individually or all at once.

- **Details**: Click an image to see ```/pictures/:pictureId``` with metadata and download option.

- **Logs**: Check ```/logs``` for action history.

- **Logout**: Use ```/logout``` to end your session.


## Directory Structure

```text
imageflow/
├── api/                           # API-specific files for Vercel deployment
│   └── routes/
│       └── upload.js             # Vercel-specific upload handler (processes images with sharp)
├── public/                        # Static assets served to clients
│   ├── pages/                    # HTML pages for different views
│   │   ├── 403.html             # Forbidden error page (CSRF or auth issues)
│   │   ├── 404.html             # Not Found error page
│   │   ├── 429.html             # Too Many Requests error page (rate limit)
│   │   ├── 500.html             # Internal Server Error page
│   │   ├── home.html            # Main upload page with Socket.IO integration
│   │   ├── image-not-found.html # Page for missing images
│   │   ├── login.html           # Login page
│   │   ├── logs.html            # Logs display page
│   │   ├── picture-detail.html  # Detailed view of a single image
│   │   └── pictures.html        # Gallery of all uploaded images
│   ├── scripts/                 # Client-side JavaScript files
│   │   ├── home.js             # Handles image uploads and real-time updates
│   │   ├── login.js            # Displays login error messages
│   │   ├── logs.js             # Fetches and displays logs with image links
│   │   ├── picture-detail.js   # Loads image details and manages downloads
│   │   └── pictures.js         # Displays image gallery with view/delete options
│   ├── styles/                  # CSS stylesheets
│   │   ├── error.css           # Styles for error pages
│   │   ├── general.css         # Global styles (layout, typography, etc.)
│   │   ├── home.css            # Styles for the upload page
│   │   ├── login.css           # Styles for the login page
│   │   ├── logs.css            # Styles for the logs page
│   │   ├── picture-detail.css  # Styles for the picture detail page
│   │   └── pictures.css        # Styles for the pictures gallery page
│   └── images/                  # Static image assets
│       └── imageflow_sign.png   # Watermark image for previews (assumed present)
├── src/                          # Server-side source code
│   ├── app.js                   # Main Express app (routes, middleware, Socket.IO)
│   ├── config.js                # Loads and validates environment variables
│   ├── processImage.js          # Simple image copy script (used in Vercel setup)
│   ├── routes.js                # API routes (upload, images, logs, downloads)
│   └── utils.js                 # Utility functions (e.g., directory creation)
├── storage/                      # Generated directories for local storage
│   ├── original_uploads/        # Original uploaded images (populated at runtime)
│   ├── previews/                # Watermarked preview images (populated at runtime)
│   └── logs/                    # Log storage
│       └── logs.txt             # Text file for action logs (created at runtime)
├── .env                         # Environment variables (configuration)
├── package.json                 # Project metadata, scripts, and dependencies
└── vercel.json                  # Vercel deployment configuration
```

## Contributing

- Fork the repository, create a branch, and submit a pull request.

- Report issues via GitHub Issues.


## Reading the Source Code
### Key Files and Their Roles
#### Configuration
- ```.env```: Defines runtime settings (port, limits, credentials).
- ```src/config.js```: Loads and validates ```.env``` variables.
#### Server Core
- ```src/app.js```:

   - Sets up Express, Socket.IO, and session management.
   - Defines routes (```/login```, ```/home```, ```/pictures/:pictureId```, etc.).
   - Handles authentication and error pages.
   - Key middleware: isAuthenticated checks session status.
  - **Vercel Note**: Socket.IO and persistent storage (```storage/```) are incompatible with Vercel’s serverless model. Replace with polling/WebSocket services and cloud storage.


- ```src/routes.js```:
   - API endpoints (```/upload```, ```/images```, ```/api/logs```, etc.).
    - Manages image processing, logging, and downloads.
    - Uses sharp for previews and formidable for uploads.
    - **Vercel Note**: Relies on local ```storage/``` directories and text-based ```logs.txt```. Replace with Cloudinary for images and a proper database for logs.
    

#### Image Processing
- ```src/processImage.js```: Simple file copy script (used in Vercel setup).
 - ```api/routes/upload.js```: Vercel-specific upload handler, processes images with sharp using temporary **/tmp** storage

#### Frontend
- ```public/pages/```: Static HTML for each view (e.g., ```home.html```, ```logs.html```).
 - ```public/scripts/```:
    - ```home.js```: Handles uploads and Socket.IO updates (local only; replace Socket.IO for Vercel).
    - ```logs.js```: Fetches and displays logs, checks image existence.
    -  ```picture-detail.js```: Loads image details and manages downloads.
    - ```pictures.js```: Lists images with view/delete options.

- ```public/styles/```: CSS for layout and styling (e.g., ```general.css```, ```error.css```).
#### Utilities
- ```src/utils.js```: Helper function ensureDir for directory creation.
- ```vercel.json```: Configures Vercel routing and builds.


### Code Flow

#### 1. Startup:
- ```src/app.js``` initializes Express and Socket.IO.
- ```src/config.js``` loads .env.
Routes from ```src/routes.js``` are mounted.

#### 2. Authentication:
-  ```/login``` in app.js checks credentials with bcrypt.
- isAuthenticated protects routes.

#### 3. Upload:
- ```/upload``` in routes.js processes files, generates previews, logs actions.
- Socket.IO emits updates to ```home.js``` (local only; replace for Vercel)..

#### 4. Viewing:
- ```/pictures``` in ```pictures.js``` fetches images via ```/images```.
- ```/pictures/:pictureId``` in ```app.js``` checks existence, serves ```picture-detail.html```.
- ```picture-detail.js``` fetches details via ```/api/picture/:pictureId```.

#### 5. Logging:
- logAction in ```routes.js``` writes to ```logs.txt``` (replace with database for Vercel).
- ```/api/logs``` serves logs to ```logs.js```.

### Additional Notes
- #### Local vs. Vercel:
    - **Local**: Uses persistent storage (```storage/```), fully functional with Socket.IO for real-time updates and text-based logging (```logs.txt```).
    - **Vercel**: Uses temporary ```/tmp``` storage, lacks support for Socket.IO and persistent text-based logs, limiting full functionality. For production on Vercel:

        - **Image Storage**: Replace the local filesystem with Cloudinary or a similar cloud storage service to handle persistent image storage.
        - **Real-Time Updates**: Replace Socket.IO with Pusher, a polling mechanism, or another WebSocket service compatible with serverless environments.
        - **Logs**: Replace ```logs.txt``` with a proper database like MongoDB, PostgreSQL, or Cloudinary’s metadata storage for scalability and persistence.

- #### Production Deployment Without Vercel:

  - You can deploy ImageFlow in production on a paid hosting service (e.g., AWS EC2, DigitalOcean, Heroku with a Node.js dyno, or any VPS) without relying on Vercel. The app’s current local setup (```src/app.js```, ```src/routes.js```, etc.) is fully functional as-is on such platforms, provided the host meets the following requirements:
      - Hosting Requirements:

         - Node.js: Version 14+ (v18 recommended for latest features and security).
        - Operating System: Linux (e.g., Ubuntu), Windows Server, or macOS (Linux preferred for production stability).
        - Storage: At least 10GB of persistent disk space for ```storage/``` (original uploads, previews, logs), scalable based on usage.
        - Memory: Minimum 1GB RAM (2GB+ recommended for handling multiple uploads and image processing with sharp).
        - Network: Public IP or domain with port access (e.g., 3000 or custom via IMAGEFLOW_PORT), plus SSL/TLS support (e.g., via Nginx or a reverse proxy).
        - Dependencies: Ability to install Node.js packages (``` npm install ```) and run a persistent process (e.g., via pm2 or systemd).


      - Setup Steps:

          - a. Upload the project files to the host (e.g., via ```git ```or SFTP).
          - b. Install dependencies: ```npm install```. 
          - c. Configure ```.env``` with ```IMAGEFLOW_ENV=prod``` and other variables.
           - d. Start the app:```npm start``` (or use ```pm2 start src/app.js --name imageflow``` for persistence).
           - e. Set up a reverse proxy (e.g., Nginx) for HTTPS and port forwarding if needed.
 
     - This approach retains all features (persistent storage, Socket.IO, text logs) without modification, unlike Vercel’s serverless constraints.

- **Logging**: ```checkImageExists``` in ```logs.js``` is approximate due to partial path matching; improve accuracy by logging full file paths in ```logAction``` (```src/routes.js```).
- **Security**: Passwords are hashed with ```bcrypt```, and downloads use expiring tokens for secure access.
- **Extensibility**: Add new routes in ```routes.js``` and corresponding pages in ```public/pages/``` to extend functionality.