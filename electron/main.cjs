const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

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
    title: "JGoode's A.I.O PC Tool",
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

// ── Run PowerShell Script (in-app execution) ──────────────────────────────────
ipcMain.handle("run-ps-script", async (event, scriptContent) => {
  const tmpFile = path.join(os.tmpdir(), `jgoode-tweak-${Date.now()}.ps1`);

  try {
    fs.writeFileSync(tmpFile, scriptContent, "utf-8");
  } catch (err) {
    event.sender.send("ps-output", { type: "stderr", text: `Failed to write script: ${err.message}\n` });
    event.sender.send("ps-output", { type: "done", code: 1 });
    return { success: false, code: 1 };
  }

  return new Promise((resolve) => {
    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", tmpFile,
    ], { windowsHide: true });

    ps.stdout.on("data", (data) => {
      const text = data.toString();
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("ps-output", { type: "stdout", text });
      }
    });

    ps.stderr.on("data", (data) => {
      const text = data.toString();
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("ps-output", { type: "stderr", text });
      }
    });

    ps.on("close", (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("ps-output", { type: "done", code: code ?? 0 });
      }
      resolve({ success: code === 0, code: code ?? 0 });
    });

    ps.on("error", (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("ps-output", { type: "stderr", text: `${err.message}\n` });
        event.sender.send("ps-output", { type: "done", code: 1 });
      }
      resolve({ success: false, code: 1 });
    });
  });
});
