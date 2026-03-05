const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const http = require("http");

const PORT = 57321;
let mainWindow = null;

function startServer() {
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = "production";

  const serverPath = path.join(__dirname, "..", "dist", "index.cjs");
  try {
    require(serverPath);
    console.log("[electron] Server module loaded on port", PORT);
  } catch (err) {
    console.error("[electron] Failed to load server:", err);
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
      console.error("[electron] Server never became ready — opening anyway");
      callback();
    }
  });
  req.setTimeout(400, () => {
    req.destroy();
    if (tries < 60) {
      setTimeout(() => waitForServer(callback, tries + 1), 500);
    } else {
      callback();
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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());
