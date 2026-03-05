const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const http = require("http");

const PORT = 57321;
let mainWindow = null;
let windowCreated = false;

function startServer() {
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = "production";
  process.env.ELECTRON_IS_PACKAGED = app.isPackaged ? "true" : "false";
  process.env.ELECTRON_RESOURCES_PATH = process.resourcesPath || "";

  const serverPath = path.join(__dirname, "..", "dist", "index.cjs");
  try {
    require(serverPath);
    console.log("[electron] Server loaded on port", PORT);
  } catch (err) {
    console.error("[electron] Failed to load server:", err);
    dialog.showErrorBox(
      "JGoode A.I.O PC Tool — Startup Error",
      `The application server failed to start.\n\nError: ${err.message}\n\nPlease reinstall the application or run as Administrator.`
    );
    app.quit();
  }
}

// Waits for the Express server to accept connections.
// Uses a single shared `done` flag so the callback fires EXACTLY once,
// even if a response and a timeout race against each other.
function waitForServer(callback) {
  let done = false;

  function attempt(tries) {
    if (done) return;

    const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
      res.resume();
      if (!done) {
        done = true;
        callback();
      }
    });

    req.on("error", () => {
      if (done) return;
      if (tries < 60) {
        setTimeout(() => attempt(tries + 1), 500);
      } else {
        done = true;
        dialog.showErrorBox(
          "JGoode A.I.O PC Tool — Server Timeout",
          "The internal server did not respond after 30 seconds.\n\nTry running as Administrator, or reinstall the application."
        );
        app.quit();
      }
    });

    // On timeout, destroy the request — the error event above handles retry.
    req.setTimeout(500, () => req.destroy());
  }

  attempt(0);
}

function createWindow() {
  if (windowCreated) return;
  windowCreated = true;

  const iconPath = path.join(__dirname, "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
    show: false,
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  let reloadAttempts = 0;
  mainWindow.webContents.on("did-fail-load", (_event, errorCode) => {
    if (errorCode === -102 || errorCode === -105) return;
    if (reloadAttempts < 5) {
      reloadAttempts++;
      setTimeout(() => mainWindow?.loadURL(`http://127.0.0.1:${PORT}`), 1500);
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    reloadAttempts = 0;
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  waitForServer(createWindow);
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());
