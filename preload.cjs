const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jikanUpdater", Object.freeze({
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onProgress(callback) {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, percent) => callback(percent);
    ipcRenderer.on("updates:progress", listener);
    return () => ipcRenderer.removeListener("updates:progress", listener);
  }
}));
