const { app, BrowserWindow, Menu, Notification, ipcMain } = require("electron");
const { createHash } = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const { constants: fsConstants, createWriteStream } = require("node:fs");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { pathToFileURL } = require("node:url");

const RELEASE_API = "https://api.github.com/repos/rob0ticbro/jiKAN/releases/latest";
const MAX_APPIMAGE_SIZE = 500 * 1024 * 1024;
let updateInProgress = false;

app.commandLine.appendSwitch("enable-gpu-rasterization");
Menu.setApplicationMenu(null);

function compareVersions(left, right) {
  const parse = version => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) throw new Error("The release contains an unsupported version number.");
    return match.slice(1).map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function appImagePath() {
  if (!app.isPackaged || process.platform !== "linux" || process.arch !== "x64" || !process.env.APPIMAGE) return null;
  return path.resolve(process.env.APPIMAGE);
}

function sendUpdateProgress(percent) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("updates:progress", percent);
  }
}

async function getLatestRelease() {
  const response = await fetch(RELEASE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "jiKAN-AppImage-Updater"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`GitHub could not be reached (HTTP ${response.status}).`);

  const release = await response.json();
  if (release.draft || release.prerelease || typeof release.tag_name !== "string") {
    throw new Error("GitHub did not return a stable jiKAN release.");
  }
  const version = release.tag_name.replace(/^v/, "");
  compareVersions(version, version);
  const name = `jiKAN-${version}-x86_64.AppImage`;
  const asset = release.assets?.find(candidate => candidate.name === name);
  if (!asset || !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_APPIMAGE_SIZE) {
    throw new Error("The latest release does not contain a supported x86_64 AppImage.");
  }
  if (typeof asset.digest !== "string" || !/^sha256:[\da-f]{64}$/i.test(asset.digest)) {
    throw new Error("The latest AppImage does not include a verifiable SHA-256 digest.");
  }
  const expectedUrl = `https://github.com/rob0ticbro/jiKAN/releases/download/${encodeURIComponent(release.tag_name)}/${encodeURIComponent(name)}`;
  if (asset.browser_download_url !== expectedUrl) {
    throw new Error("The latest release asset URL did not match the official jiKAN release.");
  }
  return { version, name, size: asset.size, digest: asset.digest.slice("sha256:".length).toLowerCase(), url: expectedUrl };
}

ipcMain.handle("app:info", () => ({
  currentVersion: app.getVersion(),
  canInstallUpdate: Boolean(appImagePath())
}));

ipcMain.handle("notifications:timer-finished", (event, title, body) => {
  if (!Notification.isSupported()) return false;
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed() && window.isFocused()) return false;
  const notification = new Notification({
    title: typeof title === "string" ? title.slice(0, 100) : "Timer complete",
    body: typeof body === "string" ? body.slice(0, 240) : "Your jiKAN timer has finished."
  });
  notification.on("click", () => {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  notification.show();
  return true;
});

ipcMain.handle("updates:check", async () => {
  const latest = await getLatestRelease();
  const currentVersion = app.getVersion();
  return {
    currentVersion,
    latestVersion: latest.version,
    updateAvailable: compareVersions(latest.version, currentVersion) > 0,
    currentIsNewer: compareVersions(latest.version, currentVersion) < 0,
    canInstallUpdate: Boolean(appImagePath())
  };
});

ipcMain.handle("updates:install", async () => {
  if (updateInProgress) throw new Error("An update is already in progress.");
  updateInProgress = true;
  let temporaryPath;
  try {
    const executablePath = appImagePath();
    if (!executablePath) throw new Error("Automatic updates require the installed 64-bit Linux AppImage.");

    const latest = await getLatestRelease();
    if (compareVersions(latest.version, app.getVersion()) <= 0) {
      return { updated: false, latestVersion: latest.version };
    }

    const installPath = await fs.realpath(executablePath);
    const currentStat = await fs.stat(installPath);
    if (!currentStat.isFile()) throw new Error("The current AppImage path is not a regular file.");
    await fs.access(path.dirname(installPath), fsConstants.W_OK);

    const response = await fetch(latest.url, {
      headers: { "User-Agent": "jiKAN-AppImage-Updater" },
      signal: AbortSignal.timeout(10 * 60 * 1000)
    });
    if (!response.ok || !response.body) {
      throw new Error(`GitHub could not download the AppImage (HTTP ${response.status}).`);
    }

    temporaryPath = path.join(path.dirname(installPath), `.${path.basename(installPath)}.update-${process.pid}-${Date.now()}`);
    const hash = createHash("sha256");
    let received = 0;
    let lastProgress = -1;
    const verifyAndTrack = new Transform({
      transform(chunk, encoding, callback) {
        received += chunk.length;
        if (received > latest.size || received > MAX_APPIMAGE_SIZE) {
          callback(new Error("The downloaded AppImage was larger than the published release asset."));
          return;
        }
        hash.update(chunk);
        const progress = Math.floor(received / latest.size * 100);
        if (progress !== lastProgress) {
          lastProgress = progress;
          sendUpdateProgress(progress);
        }
        callback(null, chunk);
      }
    });
    await pipeline(Readable.fromWeb(response.body), verifyAndTrack, createWriteStream(temporaryPath, { flags: "wx", mode: 0o755 }));

    if (received !== latest.size || hash.digest("hex") !== latest.digest) {
      throw new Error("The downloaded AppImage failed its size or SHA-256 verification.");
    }
    const headerFile = await fs.open(temporaryPath, "r");
    try {
      const header = Buffer.alloc(20);
      const { bytesRead } = await headerFile.read(header, 0, header.length, 0);
      if (bytesRead !== header.length || header.toString("ascii", 0, 4) !== "\x7fELF" ||
          header[4] !== 2 || header.toString("ascii", 8, 10) !== "AI" || header[10] !== 2 ||
          header.readUInt16LE(18) !== 62) {
        throw new Error("The downloaded file is not a 64-bit x86 AppImage.");
      }
    } finally {
      await headerFile.close();
    }

    await fs.chmod(temporaryPath, 0o755);
    await fs.rename(temporaryPath, installPath);
    temporaryPath = null;
    sendUpdateProgress(100);

    const child = spawn(installPath, [], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, APPIMAGE: installPath }
    });
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    });
    setTimeout(() => app.quit(), 700);
    return { updated: true, version: latest.version };
  } finally {
    if (temporaryPath) await fs.rm(temporaryPath, { force: true }).catch(error => {
      console.error("Could not remove the incomplete jiKAN update download.", error);
    });
    updateInProgress = false;
  }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    title: "jiKAN — 時計",
    icon: path.join(__dirname, "assets", "jikan.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
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
