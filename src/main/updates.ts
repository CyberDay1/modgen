import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

const UPDATE_CHECK_INTERVAL = 1000 * 60 * 30; // every 30 minutes

function isEligibleEnvironment(): boolean {
  return app.isPackaged;
}

function configureFeed() {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'CyberDay1',
    repo: 'modgen'
  });
  autoUpdater.allowPrerelease = false;
}

function wireEventLogging() {
  autoUpdater.on("checking-for-update", () => {
    console.info("[auto-updater] Checking for updates");
  });

  autoUpdater.on("update-available", () => {
    console.info("[auto-updater] Update available, downloading");
  });

  autoUpdater.on("update-not-available", () => {
    console.info("[auto-updater] No updates available");
  });

  autoUpdater.on("error", (error: unknown) => {
    console.error("[auto-updater] Error occurred", error);
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        buttons: ["Restart", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Ready",
        message: "A new version of modgen is ready. Restart now to apply the update.",
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      })
      .catch((error: unknown) => console.error("[auto-updater] Failed to display update dialog", error));
  });
}

function scheduleChecks() {
  const check = () => {
    autoUpdater
      .checkForUpdates()
      .catch((error: unknown) => console.error("[auto-updater] Failed to check for updates", error));
  };

  check();
  setInterval(check, UPDATE_CHECK_INTERVAL);
}

export function initAutoUpdate() {
  if (!isEligibleEnvironment()) {
    console.info("[auto-updater] Skipping auto-update in development or unpackaged environment");
    return;
  }

  configureFeed();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  wireEventLogging();
  scheduleChecks();
}
