const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");

let mainWindow = null;
let serverProcess = null;
const PORT = 57321;

function startServer() {
  const serverPath = path.join(__dirname, "..", "dist", "index.cjs");
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      ELECTRON: "1",
    },
    silent: false,
  });

  serverProcess.on("error", (err) => {
    console.error("[electron] Server process error:", err);
  });

  serverProcess.on("exit", (code) => {
    console.log("[electron] Server exited with code:", code);
  });
}

function waitForServer(callback, tries = 0) {
  const req = http.get(`http://localhost:${PORT}/`, (res) => {
    callback();
  });
  req.on("error", () => {
    if (tries < 60) {
      setTimeout(() => waitForServer(callback, tries + 1), 500);
    } else {
      console.error("[electron] Server never became ready");
      callback();
    }
  });
  req.setTimeout(500, () => {
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

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
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
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
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
