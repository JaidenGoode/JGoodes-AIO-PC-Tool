const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const http = require("http");

const PORT = 57321;
let mainWindow = null;

function startServer() {
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = "production";
  process.env.ELECTRON_IS_PACKAGED = app.isPackaged ? "true" : "false";
  process.env.ELECTRON_RESOURCES_PATH = process.resourcesPath || "";

  const serverPath = path.join(__dirname, "..", "dist", "index.cjs");
  try {
    require(serverPath);
    console.log("[electron] Server module loaded on port", PORT);
  } catch (err) {
    console.error("[electron] Failed to load server:", err);
    dialog.showErrorBox(
      "JGoode A.I.O PC Tool — Startup Error",
      `The application server failed to start.\n\nError: ${err.message}\n\nPlease reinstall the application or run as Administrator.`
    );
    app.quit();
  }
}

function waitForServer(callback, tries = 0) {
  const req = http.get(`http://127.0.0.1:${PORT}/`, () => {
    callback();
  });
  req.on("error", () => {
    if (tries < 60) {
      setTimeout(() => waitForServer(callback, tries + 1), 500);
    } else {
      dialog.showErrorBox(
        "JGoode A.I.O PC Tool — Server Timeout",
        "The internal server did not respond after 30 seconds.\n\nTry running the application as Administrator, or reinstall."
      );
      app.quit();
    }
  });
  req.setTimeout(400, () => {
    req.destroy();
    if (tries < 60) {
      setTimeout(() => waitForServer(callback, tries + 1), 500);
    } else {
      dialog.showErrorBox(
        "JGoode A.I.O PC Tool — Server Timeout",
        "The internal server did not respond after 30 seconds.\n\nTry running the application as Administrator, or reinstall."
      );
      app.quit();
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
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

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode === -102 || errorCode === -105) return;
    console.error("[electron] Page failed to load:", errorCode, errorDescription);
    setTimeout(() => mainWindow?.loadURL(`http://127.0.0.1:${PORT}`), 1000);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  waitForServer(() => {
    createWindow();
  });
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
