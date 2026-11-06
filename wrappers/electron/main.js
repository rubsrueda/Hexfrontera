'use strict';
/* Proceso principal de Electron para Hexfrontier (Steam / PC).

   - Sirve el juego desde un protocolo propio `app://hexfrontier/` en lugar de
     `file://`: así hay un origen estable (localStorage/DevTools coherentes) y
     las rutas relativas del shell siguen funcionando igual que en web.
   - Nunca carga nada remoto ni habilita Node en el renderer.
   - Los guardados viven en `app.getPath('userData')/saves/hf_<clave>.json`
     (capa probada en electron/saves.js). Steam Auto-Cloud sincroniza esa
     carpeta sin escribir código extra.
   - Cierre ordenado: antes de destruir la ventana se pide al renderer que
     guarde (HF.requestSave + volcado síncrono) y se espera su confirmación.
*/

const { app, BrowserWindow, Menu, ipcMain, net, protocol, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { createStore } = require('./saves');

const APP_ID = 'com.hexfrontier.game';
const SCHEME = 'app';
const HOST = 'hexfrontier';

// www/ se genera con `npm run stage`. Empaquetado vive en resources/www
// (extraResources de electron-builder).
const WEB_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'www')
  : path.join(__dirname, '..', 'www');

const store = createStore(() => path.join(app.getPath('userData'), 'saves'));

let win = null;
let quitting = false;        // el usuario ya pidió salir y el guardado terminó
let pendingClose = false;    // esperando la confirmación del renderer
let cspArmed = false;        // onHeadersReceived se registra una sola vez

// ---------------------------------------------------------------------------
// Protocolo app://
// ---------------------------------------------------------------------------
protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true }
}]);

function serveWeb() {
  protocol.handle(SCHEME, request => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); }
    catch (e) { return new Response('bad request', { status: 400 }); }
    if (!pathname || pathname === '/') pathname = '/index.html';
    const rel = path.normalize(pathname).replace(/^[/\\]+/, '');
    const file = path.join(WEB_DIR, rel);
    if (file !== WEB_DIR && !file.startsWith(WEB_DIR + path.sep)) {
      return new Response('forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(file).toString());
  });
}

// ---------------------------------------------------------------------------
// Ventana
// ---------------------------------------------------------------------------
function iconPath() {
  for (const name of ['icon.png', 'icon.ico', 'icon.icns']) {
    const p = path.join(__dirname, '..', 'build', name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0F1D',
    show: false,
    title: 'Hexfrontier',
    icon: iconPath(),
    autoHideMenuBar: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // El guardado no debe estrangularse cuando la ventana está minimizada.
      backgroundThrottling: false
    }
  });

  if (process.argv.includes('--devtools')) win.webContents.openDevTools({ mode: 'detach' });

  // F11 / Alt+Enter: pantalla completa (el menú nativo está desactivado).
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(SCHEME + '://')) e.preventDefault();
  });

  applyContentSecurityPolicy();
  win.loadURL(SCHEME + '://' + HOST + '/index.html');
  win.once('ready-to-show', () => win.show());
  win.on('close', onWindowClose);
  win.on('closed', () => { win = null; });
}

function applyContentSecurityPolicy() {
  if (cspArmed || process.env.HF_NO_CSP === '1') return;
  cspArmed = true;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' https://upload.wikimedia.org data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://upload.wikimedia.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
  ].join('; ');
  win.webContents.session.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: Object.assign({}, details.responseHeaders, {
      'Content-Security-Policy': [csp]
    }) });
  });
}

// ---------------------------------------------------------------------------
// Cierre ordenado
// ---------------------------------------------------------------------------
function onWindowClose(e) {
  if (quitting) return;
  e.preventDefault();
  requestSaveAndQuit();
}

function requestSaveAndQuit() {
  if (pendingClose) return;
  if (!win || win.isDestroyed()) { quitting = true; app.quit(); return; }
  pendingClose = true;
  win.webContents.send('hf:before-quit');
  // Red de seguridad: si el renderer está colgado, no bloquear la salida.
  const failsafe = setTimeout(() => finishQuit(), 1800);
  ipcMain.once('hf:before-quit-done', () => { clearTimeout(failsafe); finishQuit(); });
}

function finishQuit() {
  if (quitting) return;
  pendingClose = false;
  quitting = true;
  try { if (win && !win.isDestroyed()) win.destroy(); } catch (e) { }
  app.quit();
}

// ---------------------------------------------------------------------------
// IPC de guardado
// ---------------------------------------------------------------------------
ipcMain.on('hf:store:get', (e, key) => {
  try { e.returnValue = store.readKey(key); } catch (err) { e.returnValue = null; }
});
ipcMain.on('hf:store:flush', (e, entries) => { e.returnValue = store.writeEntries(entries); });
ipcMain.on('hf:store:path', e => { e.returnValue = store.dir(); });
ipcMain.on('hf:renderer-ready', () => { /* hook de arranque */ });
ipcMain.handle('hf:store:set-many', (e, entries) => store.writeEntries(entries));
ipcMain.handle('hf:store:keys', () => store.listKeys());
ipcMain.handle('hf:saves:open', () => { try { store.ensure(); } catch (e) { } return shell.openPath(store.dir()); });
ipcMain.handle('hf:app:quit', () => { requestSaveAndQuit(); return true; });

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.setAppUserModelId(APP_ID);

  // El overlay de Steam no se inyecta en algunas builds de Chromium. Si al
  // probar con Steam no aparece, arranca con HF_STEAM_OVERLAY=1.
  if (process.env.HF_STEAM_OVERLAY === '1') app.commandLine.appendSwitch('in-process-gpu');

  app.whenReady().then(() => {
    try { store.ensure(); } catch (e) { }
    try { store.repairOrphans(); } catch (e) { console.warn('[saves] repair', e); }
    Menu.setApplicationMenu(null);
    serveWeb();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('before-quit', e => {
    if (quitting) return;
    e.preventDefault();
    requestSaveAndQuit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
