import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'path';
import url from 'url';

const isDev = process.env.NODE_ENV === 'development';

const createWindow = async (): Promise<void> => {
  nativeTheme.themeSource = 'dark';

  const preloadScript = isDev
    ? path.join(__dirname, 'preload.ts')
    : path.join(__dirname, 'preload.js');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#121212',
    title: 'modgen',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadScript
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = url.format({
      pathname: path.join(__dirname, '../renderer/index.html'),
      protocol: 'file:',
      slashes: true
    });

    await mainWindow.loadURL(indexPath);
  }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
