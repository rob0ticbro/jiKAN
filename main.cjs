const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.commandLine.appendSwitch("enable-gpu-rasterization");
Menu.setApplicationMenu(null);

function createWindow() {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    title: "HOUR — 時間 (Jikan)",
    icon: path.join(__dirname, "assets", "hour.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const appUrl = pathToFileURL(path.join(__dirname, "index.html")).toString();
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== appUrl) {
      event.preventDefault();
    }
  });
  window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
