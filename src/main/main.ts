import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import windowStateKeeper from 'electron-window-state';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Enable autoplay without user gesture requirement (belt-and-suspenders with splash screen)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow: BrowserWindow | null = null;

/**
 * Wait for a URL to accept connections before loading it.
 * Electron Forge's Vite plugin can report "ready" before the dev server
 * is actually accepting TCP connections — retry with backoff to handle the race.
 */
async function loadURLWithRetry(win: BrowserWindow, url: string, maxRetries = 10): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await win.loadURL(url);
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ERR_CONNECTION_REFUSED') && attempt < maxRetries - 1) {
        const delay = Math.min(200 * Math.pow(1.5, attempt), 2000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

const createWindow = () => {
  // Persist window position and size between launches
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 700,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Auto-save window bounds on move/resize
  mainWindowState.manage(mainWindow);

  // Load the renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    loadURLWithRetry(mainWindow, MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((err) => {
      console.error('Failed to load dev server after retries:', err);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Set up native macOS menu
const createMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  // IPC handlers
  ipcMain.handle('get-app-version', () => app.getVersion());

  createMenu();
  createWindow();

  // Register dev tools shortcut: Cmd+Opt+I (macOS) / Ctrl+Shift+I (other)
  const devToolsAccelerator =
    process.platform === 'darwin' ? 'CommandOrControl+Option+I' : 'Ctrl+Shift+I';
  globalShortcut.register(devToolsAccelerator, () => {
    mainWindow?.webContents.toggleDevTools();
  });
});

// Quit when all windows are closed (including macOS for simplicity in dev)
app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
