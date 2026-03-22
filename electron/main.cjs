const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

app.name = "JGoode's A.I.O PC Tool";

const PORT = 57321;
let mainWindow = null;
let windowCreated = false;

// ── LibreHardwareMonitor (silent hardware sensor provider) ────────────────────
let lhmProcess = null;
let lhmPid     = null;

const LHM_VERSION      = "0.9.6";
const LHM_DIR          = path.join(os.homedir(), "AppData", "Local", "JGoode-AIO", "LibreHardwareMonitor");
const LHM_EXE          = path.join(LHM_DIR, "LibreHardwareMonitor.exe");
const LHM_VERSION_FILE = path.join(LHM_DIR, "version.txt");
const LHM_URL          = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.zip";

function downloadFile(url, dest, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 5;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, { headers: { "User-Agent": "JGoode-AIO-PC-Tool" } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        downloadFile(res.headers.location, dest, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        reject(new Error("HTTP " + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    request.on("error", (err) => { file.close(); reject(err); });
  });
}

async function downloadLHM() {
  try {
    // Wipe old installation so we get a clean v0.9.6 copy
    try { fs.rmSync(LHM_DIR, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(LHM_DIR, { recursive: true });
    const zipPath = path.join(os.tmpdir(), "JGoode-LHM.zip");
    console.log("[LHM] Downloading LibreHardwareMonitor v" + LHM_VERSION + "...");
    await downloadFile(LHM_URL, zipPath);
    await new Promise((resolve) => {
      const ps = spawn("powershell.exe", [
        "-NoProfile", "-Command",
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${LHM_DIR}' -Force`
      ], { windowsHide: true });
      ps.on("close", resolve);
      ps.on("error", resolve);
    });
    try { fs.unlinkSync(zipPath); } catch {}
    if (fs.existsSync(LHM_EXE)) {
      fs.writeFileSync(LHM_VERSION_FILE, LHM_VERSION, "utf8");
      console.log("[LHM] Download complete — v" + LHM_VERSION);
      return true;
    }
    return false;
  } catch (err) {
    console.log("[LHM] Download failed:", err.message);
    return false;
  }
}

async function startLHM() {
  if (process.platform !== "win32") return;
  try {
    // Re-download if missing or outdated version
    let needsDownload = !fs.existsSync(LHM_EXE);
    if (!needsDownload) {
      try {
        const installed = fs.readFileSync(LHM_VERSION_FILE, "utf8").trim();
        if (installed !== LHM_VERSION) needsDownload = true;
      } catch {
        needsDownload = true;
      }
    }
    if (needsDownload) {
      const ok = await downloadLHM();
      if (!ok) { console.log("[LHM] Skipping — exe not found after download"); return; }
    }

    // Pre-write LHM config to start minimized (only on first launch — don't overwrite user prefs)
    const configPath = path.join(LHM_DIR, "LibreHardwareMonitor.config");
    if (!fs.existsSync(configPath)) {
      try {
        fs.writeFileSync(configPath,
          '<?xml version="1.0" encoding="utf-8"?>\n<settings>\n  <value name="startMinimized">true</value>\n  <value name="minimizeToTray">true</value>\n</settings>\n',
          "utf8"
        );
      } catch {}
    }

    // Launch via PowerShell with WindowStyle Hidden — this properly sets SW_HIDE in STARTUPINFO
    // which suppresses the GUI window at the OS level (windowsHide:true only hides console windows)
    const exeQ = LHM_EXE.replace(/'/g, "''");
    const pidFile = path.join(os.tmpdir(), "jgoode-lhm.pid");
    const psCmd = `$p = Start-Process -FilePath '${exeQ}' -WindowStyle Hidden -PassThru; if ($p) { $p.Id | Out-File '${pidFile.replace(/'/g, "''")}' -Encoding ASCII -Force }`;

    lhmProcess = spawn("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
      "-Command", psCmd
    ], { windowsHide: true });

    lhmProcess.on("error", () => { lhmProcess = null; });
    lhmProcess.on("exit", () => {
      lhmProcess = null;
      // Read the PID that PowerShell wrote to disk
      try {
        const pidStr = fs.readFileSync(pidFile, "utf8").trim();
        const pid = parseInt(pidStr);
        if (!isNaN(pid) && pid > 0) {
          lhmPid = pid;
          console.log("[LHM] Running silently (PID " + lhmPid + ") — CPU/GPU sensors active (v" + LHM_VERSION + ")");
        }
      } catch {}
    });

  } catch (err) {
    console.log("[LHM] Failed to start:", err.message);
    lhmProcess = null;
    lhmPid = null;
  }
}

function stopLHM() {
  if (lhmPid) {
    try { spawn("taskkill", ["/PID", String(lhmPid), "/F"], { windowsHide: true }); } catch {}
    lhmPid = null;
    console.log("[LHM] Stopped");
  }
  if (lhmProcess) {
    try { lhmProcess.kill(); } catch {}
    lhmProcess = null;
  }
}

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
    frame: false,
    titleBarStyle: "hidden",
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
  startLHM();
  waitForServer(createWindow);
});

app.on("before-quit", () => {
  stopLHM();
});

app.on("window-all-closed", () => {
  stopLHM();
  app.quit();
});

ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());
ipcMain.handle("window-is-maximized", () => mainWindow?.isMaximized() ?? false);

// ── File Save / Open dialogs ───────────────────────────────────────────────────
ipcMain.handle("save-file", async (_event, { content, defaultName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "JGoode-Profile.json",
    filters: [{ name: "JSON Profile", extensions: ["json"] }],
  });
  if (!canceled && filePath) {
    try { fs.writeFileSync(filePath, content, "utf-8"); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
  }
  return { success: false };
});

ipcMain.handle("open-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "JSON Profile", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (!canceled && filePaths[0]) {
    try { return { success: true, content: fs.readFileSync(filePaths[0], "utf-8") }; }
    catch (err) { return { success: false, error: err.message }; }
  }
  return { success: false };
});

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
