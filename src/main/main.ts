import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initAutoUpdate } from './updates';

function createWindow() {
  const win = new BrowserWindow({ width: 1024, height: 768 });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  initAutoUpdate();
});
