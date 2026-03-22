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

const LHM_VERSION      = "latest-2026-03c";
const LHM_DIR          = path.join(os.homedir(), "AppData", "Local", "JGoode-AIO", "LibreHardwareMonitor");
const LHM_EXE          = path.join(LHM_DIR, "LibreHardwareMonitor.exe");
const LHM_VERSION_FILE = path.join(LHM_DIR, "version.txt");
const LHM_URL          = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest/download/LibreHardwareMonitor.zip";

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

async function extractLHM(zipPath) {
  try {
    const tmpExtract = path.join(os.tmpdir(), "JGoode-LHM-extract");
    try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(tmpExtract, { recursive: true });
    await new Promise((resolve) => {
      const ps = spawn("powershell.exe", [
        "-NoProfile", "-Command",
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpExtract.replace(/'/g, "''")}' -Force`
      ], { windowsHide: true });
      ps.on("close", resolve);
      ps.on("error", resolve);
    });
    // Find exe — could be at root or one subfolder deep
    let foundExe = path.join(tmpExtract, "LibreHardwareMonitor.exe");
    if (!fs.existsSync(foundExe)) {
      for (const e of fs.readdirSync(tmpExtract)) {
        const candidate = path.join(tmpExtract, e, "LibreHardwareMonitor.exe");
        if (fs.existsSync(candidate)) { foundExe = candidate; break; }
      }
    }
    if (!fs.existsSync(foundExe)) {
      console.log("[LHM] Exe not found in zip");
      try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}
      return false;
    }
    // Replace old install only after confirming zip is valid
    try { fs.rmSync(LHM_DIR, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(LHM_DIR, { recursive: true });
    const srcDir = path.dirname(foundExe);
    for (const f of fs.readdirSync(srcDir)) {
      try { fs.cpSync(path.join(srcDir, f), path.join(LHM_DIR, f), { recursive: true }); } catch {}
    }
    try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}
    if (!fs.existsSync(LHM_EXE)) return false;
    fs.writeFileSync(LHM_VERSION_FILE, LHM_VERSION, "utf8");
    const dlls = fs.readdirSync(LHM_DIR).filter(f => f.endsWith(".dll") || f.endsWith(".exe"));
    console.log("[LHM] Extracted — v" + LHM_VERSION + " — " + dlls.join(", "));
    if (!fs.existsSync(path.join(LHM_DIR, "System.Memory.dll"))) {
      console.log("[LHM] WARNING: System.Memory.dll missing — LHM may crash on startup");
    }
    return true;
  } catch (err) {
    console.log("[LHM] Extract failed:", err.message);
    return false;
  }
}

async function downloadLHM() {
  // 1 — Prefer the zip bundled inside the installer (no internet needed, guaranteed DLL set)
  const bundledZip = path.join(process.resourcesPath || "", "lhm", "LibreHardwareMonitor.zip");
  if (fs.existsSync(bundledZip)) {
    console.log("[LHM] Using bundled zip from resources:", bundledZip);
    return await extractLHM(bundledZip);
  }

  // 2 — Bundled zip not present (dev mode or missing): download from GitHub
  console.log("[LHM] Bundled zip not found — downloading from GitHub...");
  const zipPath = path.join(os.tmpdir(), "JGoode-LHM.zip");
  try {
    await downloadFile(LHM_URL, zipPath);
  } catch (err) {
    console.log("[LHM] Download failed:", err.message);
    try { fs.unlinkSync(zipPath); } catch {}
    return false;
  }
  const ok = await extractLHM(zipPath);
  try { fs.unlinkSync(zipPath); } catch {}
  return ok;
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
    // Integrity check — if critical DLLs are missing the install is corrupt; force re-download
    if (!needsDownload) {
      const criticalDlls = ["System.Memory.dll", "LibreHardwareMonitorLib.dll"];
      for (const dll of criticalDlls) {
        if (!fs.existsSync(path.join(LHM_DIR, dll))) {
          console.log("[LHM] Missing DLL:", dll, "— forcing re-download");
          needsDownload = true;
          break;
        }
      }
    }
    const isFirstInstall = needsDownload;
    if (needsDownload) {
      const ok = await downloadLHM();
      if (!ok) {
        // Download failed — fall back to any existing exe rather than giving up
        if (!fs.existsSync(LHM_EXE)) {
          console.log("[LHM] Skipping — download failed and no existing exe");
          return;
        }
        console.log("[LHM] Download failed — using existing exe");
      }
    }

    // Always force-write config — startMinimized + minimizeToTray + WMI ENABLED
    // wmiEnabled=true is critical: LHM only registers its WMI namespace when this is set
    const configPath = path.join(LHM_DIR, "LibreHardwareMonitor.config");
    try {
      // Include every known key-name variant so at least one matches regardless of LHM version
      fs.writeFileSync(configPath,
        '<?xml version="1.0" encoding="utf-8"?>\n<settings>\n' +
        '  <value name="startMinimized">true</value>\n' +
        '  <value name="minimizeToTray">true</value>\n' +
        '  <value name="startWithWindows">false</value>\n' +
        '  <value name="wmiEnabled">true</value>\n' +
        '  <value name="mainForm.startMinimized">true</value>\n' +
        '  <value name="mainForm.minimizeToTray">true</value>\n' +
        '  <value name="mainForm.wmi">true</value>\n' +
        '  <value name="wmi">true</value>\n' +
        '</settings>\n',
        "utf8"
      );
    } catch {}

    // Kill any existing LHM process so it restarts fresh with the new config (WMI enabled)
    // Without this, an old LHM instance running without WMI won't register the namespace
    await new Promise((resolve) => {
      const kill = spawn("taskkill", ["/F", "/IM", "LibreHardwareMonitor.exe"], { windowsHide: true });
      kill.on("close", resolve);
      kill.on("error", resolve);
    });
    // Brief pause so Windows fully cleans up the process before we relaunch
    await new Promise((r) => setTimeout(r, 1500));

    // Launch LHM via PowerShell Start-Process -WindowStyle Hidden so it never renders a visible
    // window. Using PowerShell as the launcher means Windows sets dwFlags=STARTF_USESHOWWINDOW
    // with SW_HIDE in STARTUPINFO *before* the process creates its window — no flash at all.
    const lhmExeEscaped = LHM_EXE.replace(/'/g, "''");
    const launchScript = `Start-Process -FilePath '${lhmExeEscaped}' -WindowStyle Hidden`;
    lhmProcess = spawn("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
      "-Command", launchScript,
    ], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
    lhmProcess.unref();
    lhmPid = lhmProcess.pid;
    console.log("[LHM] Started (hidden) — v" + LHM_VERSION);
    lhmProcess.on("error", (e) => { console.log("[LHM] Spawn error:", e.message); lhmProcess = null; lhmPid = null; });
    lhmProcess.on("exit", (code) => { console.log("[LHM] PS launcher exited (code " + code + ")"); lhmProcess = null; });

    // Belt-and-suspenders: hide via Win32 ShowWindow in case any window slips through
    // (e.g. WinRing0 driver prompt on very first run). Run early and often.
    const hideScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win32Hide {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int n);
}
'@
$procs = Get-Process "LibreHardwareMonitor" -EA SilentlyContinue
foreach ($p in $procs) { if ($p.MainWindowHandle -ne [IntPtr]::Zero) { [Win32Hide]::ShowWindow($p.MainWindowHandle, 0) } }`;
    const runHide = () => spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", hideScript], { windowsHide: true });
    setTimeout(runHide, 800);
    setTimeout(runHide, 2000);
    setTimeout(runHide, 5000);
    setTimeout(runHide, 10000);

    // On first install: show a one-time notice
    if (isFirstInstall) {
      setTimeout(() => {
        dialog.showMessageBox(mainWindow || undefined, {
          type: "info",
          title: "Hardware Monitor Installed",
          message: "LibreHardwareMonitor has been installed.",
          detail: "Temperature sensors are now loading.\n\nIf WinRing0 prompted you to install a driver, please restart the app once for CPU temperature to appear.",
          buttons: ["OK"],
          defaultId: 0,
        }).catch(() => {});
      }, 7000);
    }

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
