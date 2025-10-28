import { app, BrowserWindow } from "electron";
import path from "path";
import { initAutoUpdate } from "./updates";

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      // Enable context isolation and preload bridge for renderer → main communication
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload.js"), // compiled preload.ts
    },
  });

  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  initAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
