// src/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openProjectDirectory: () => ipcRenderer.invoke("open-project-directory"),
  requestGradleLogStream: () => ipcRenderer.invoke("request-gradle-log-stream"),
  startGradleLogStream: () => ipcRenderer.invoke("start-gradle-log-stream"),
  stopGradleLogStream: () => ipcRenderer.invoke("stop-gradle-log-stream"),
  onGradleLog: (listener: (payload: unknown) => void) => {
    const channel = "gradle-log";
    const subscription = (_: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
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
    openProjectDirectory: () => ipcRenderer.invoke("open-project-directory"),
  },
  build: {
    startStreaming: () => ipcRenderer.invoke("modgen-build-start"),
    stopStreaming: () => ipcRenderer.invoke("modgen-build-stop"),
    onLog: (listener: (payload: unknown) => void) => {
      const channel = "modgen-build-log";
      const subscription = (_: unknown, payload: unknown) => listener(payload);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  },
});

declare global {
  interface Window {
    electronAPI?: {
      openProjectDirectory?: () => void | Promise<void>;
      requestGradleLogStream?: () => void;
      startGradleLogStream?: () => void;
      stopGradleLogStream?: () => void;
      onGradleLog?: (listener: (payload: unknown) => void) => () => void;
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
        openProjectDirectory?: () => void;
      };
      build?: {
        startStreaming?: () => void;
        stopStreaming?: () => void;
        onLog?: (listener: (payload: unknown) => void) => () => void;
      };
      onGradleLog?: (listener: (payload: unknown) => void) => () => void;
    };
  }
}
