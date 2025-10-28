declare module "electron-updater" {
  import type { EventEmitter } from "events";

  export interface AppUpdater extends EventEmitter {
    allowPrerelease: boolean;
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    setFeedURL(options: unknown): void;
    checkForUpdates(): Promise<unknown>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export const autoUpdater: AppUpdater;
}
