// ARIA desktop app (Windows / macOS / Linux) built with Electron.
// The app's built web files (dist/) are served from a small local server on a fixed
// address, so sign-in and saved data work the same as on the website.
const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Sign-in providers must allow this exact address (Supabase redirect URLs, Google JS origins).
const PORT = 5180;
const ORIGIN = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, '..', 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

function serve() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.normalize(path.join(ROOT, url));
      if (!file.startsWith(ROOT)) return res.writeHead(403).end();
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// Pages ARIA itself opens in pop-up windows (Google's sign-in); everything else goes to the normal browser.
const POPUP_HOSTS = ['accounts.google.com'];
const IN_APP_HOSTS = ['github.com', 'accounts.google.com', 'rahvvxklhrfuenvtwfty.supabase.co', 'localhost'];

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#16161d',
    title: 'ARIA',
    icon: path.join(ROOT, 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    const host = new URL(url).hostname;
    if (POPUP_HOSTS.includes(host)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 500, height: 650, autoHideMenuBar: true } };
    }
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Links to other sites (e.g. "Email us") open outside the app.
  win.webContents.on('will-navigate', (event, url) => {
    const { hostname, protocol } = new URL(url);
    if (protocol === 'mailto:' || (protocol.startsWith('http') && !IN_APP_HOSTS.includes(hostname))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(ORIGIN);
}

// Only one ARIA window at a time; opening it again focuses the existing one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    await serve();
    createWindow();
    app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
