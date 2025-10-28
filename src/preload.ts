// src/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openProjectDirectory: () => ipcRenderer.invoke("open-project-directory"),
  requestGradleLogStream: () => ipcRenderer.invoke("request-gradle-log-stream"),
  startGradleLogStream: () => ipcRenderer.invoke("start-gradle-log-stream"),
  stopGradleLogStream: () => ipcRenderer.invoke("stop-gradle-log-stream"),
});

contextBridge.exposeInMainWorld("modgen", {
  project: {
    rootDirectory: "",
    rootPath: "",
    directory: "",
  },
  paths: {
    projectRoot: "",
    project: "",
  },
  commands: {
    build: () => ipcRenderer.invoke("modgen-build"),
    clean: () => ipcRenderer.invoke("modgen-clean"),
  },
});

declare global {
  interface Window {
    electronAPI?: {
      openProjectDirectory?: () => void | Promise<void>;
      requestGradleLogStream?: () => void;
      startGradleLogStream?: () => void;
      stopGradleLogStream?: () => void;
    };
    modgen?: {
      project?: {
        rootDirectory?: string;
        rootPath?: string;
        directory?: string;
      };
      paths?: {
        projectRoot?: string;
        project?: string;
      };
      commands?: {
        build?: () => void;
        clean?: () => void;
      };
    };
  }
}
