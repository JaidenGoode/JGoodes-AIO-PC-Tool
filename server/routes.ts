import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import si from "systeminformation";
import { getGitHubUser, listUserRepos, createRepo, pushFilesViaTree } from "./github";
import { TWEAKS_SEED } from "@shared/tweaks-seed";
import fs from "fs";
import path from "path";
import os from "os";
import { exec, spawn } from "child_process";

// ── PowerShell / cmd helpers ──────────────────────────────────────────────────
function runPowerShell(script: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell.exe -NonInteractive -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { timeout: timeoutMs },
      (_err, stdout, stderr) => resolve((stdout || stderr || "").trim())
    );
  });
}

function runCmd(command: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { shell: true, timeout: timeoutMs, windowsHide: true },
      (_err, stdout, stderr) => resolve((stdout || stderr || "").trim())
    );
  });
}

function openTerminalWithCommand(command: string): void {
  spawn("cmd.exe", ["/c", "start", "cmd", "/k", command], {
    detached: true,
    stdio: "ignore",
  });
}

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seedTweaksIfNeeded() {
  try {
    const existing = await storage.getTweaks();
    if (existing.length === 0) {
      for (const tweak of TWEAKS_SEED) {
        await storage.createTweak(tweak);
      }
      console.log(`[seed] Seeded ${TWEAKS_SEED.length} tweaks`);
    }
  } catch (err) {
    console.error("[seed] Failed to seed tweaks:", err);
  }
}

// ── Cleaner helpers ───────────────────────────────────────────────────────────
function expandPath(p: string): string {
  return p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function getDirSize(
  dirPath: string,
  depth = 0
): Promise<{ size: number; count: number }> {
  if (depth > 6) return { size: 0, count: 0 };
  let size = 0;
  let count = 0;
  try {
    const items = await fs.promises.readdir(dirPath);
    await Promise.all(
      items.slice(0, 500).map(async (item) => {
        const full = path.join(dirPath, item);
        try {
          const stat = await fs.promises.lstat(full);
          if (stat.isDirectory()) {
            const sub = await getDirSize(full, depth + 1);
            size += sub.size;
            count += sub.count;
          } else if (stat.isFile()) {
            size += stat.size;
            count++;
          }
        } catch {}
      })
    );
  } catch {}
  return { size, count };
}

async function deleteContents(dirPath: string): Promise<number> {
  let freed = 0;
  try {
    const items = await fs.promises.readdir(dirPath);
    await Promise.all(
      items.map(async (item) => {
        const full = path.join(dirPath, item);
        try {
          const stat = await fs.promises.lstat(full);
          if (stat.isDirectory()) {
            const sub = await getDirSize(full);
            freed += sub.size;
          } else {
            freed += stat.size;
          }
          await fs.promises.rm(full, { recursive: true, force: true });
        } catch {}
      })
    );
  } catch {}
  return freed;
}

interface CleanCategory {
  id: string;
  name: string;
  description: string;
  paths: string[];
}

function getCleanCategories(): CleanCategory[] {
  const isWin = process.platform === "win32";
  const tmp = process.env.TEMP || process.env.TMP || path.join(os.homedir(), "AppData", "Local", "Temp");
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const roaming = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");

  if (isWin) {
    return [
      {
        id: "temp",
        name: "Temporary Files",
        description: "User and system temp files (%TEMP%, C:\\Windows\\Temp)",
        paths: [tmp, "C:\\Windows\\Temp"],
      },
      {
        id: "prefetch",
        name: "Prefetch Cache",
        description: "Windows app prefetch files that accumulate over time",
        paths: ["C:\\Windows\\Prefetch"],
      },
      {
        id: "wupdate",
        name: "Windows Update Cache",
        description: "Downloaded Windows Update files (safe to clear after updates)",
        paths: ["C:\\Windows\\SoftwareDistribution\\Download"],
      },
      {
        id: "errorreports",
        name: "Error Reports",
        description: "Windows crash and error report archives",
        paths: [
          path.join(local, "Microsoft", "Windows", "WER", "ReportArchive"),
          path.join(local, "Microsoft", "Windows", "WER", "ReportQueue"),
          "C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive",
        ],
      },
      {
        id: "browser",
        name: "Browser Cache",
        description: "Chrome, Edge and Opera GX browser cache files",
        paths: [
          path.join(local, "Google", "Chrome", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Google", "Chrome", "User Data", "Default", "Code Cache"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "Code Cache"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "GPUCache"),
        ],
      },
      {
        id: "thumbnails",
        name: "Thumbnail Cache",
        description: "Windows Explorer thumbnail cache database",
        paths: [
          path.join(local, "Microsoft", "Windows", "Explorer"),
        ],
      },
      {
        id: "dumpfiles",
        name: "Memory Dump Files",
        description: "Windows crash dump files (minidumps)",
        paths: [
          "C:\\Windows\\Minidump",
          path.join(local, "CrashDumps"),
        ],
      },
      {
        id: "logs",
        name: "Log Files",
        description: "Windows system CBS and DISM log files",
        paths: [
          "C:\\Windows\\Logs\\CBS",
          "C:\\Windows\\Logs\\DISM",
        ],
      },
      {
        id: "shadercache",
        name: "DirectX Shader Cache",
        description: "DirectX 12 and GPU vendor shader caches built by games and apps (rebuilt automatically on next launch)",
        paths: [
          path.join(local, "D3DSCache"),
          path.join(local, "Microsoft", "DirectX Shader Cache"),
          path.join(local, "NVIDIA", "DXCache"),
          path.join(local, "NVIDIA Corporation", "NV_Cache"),
          path.join(local, "AMD", "DXCache"),
          path.join(local, "Intel", "ShaderCache"),
        ],
      },
      {
        id: "recycle",
        name: "Recycle Bin",
        description: "Files sitting in the Windows Recycle Bin across all drives",
        paths: [],
      },
    ];
  }

  return [];
}

const CLEAN_CATEGORIES: CleanCategory[] = getCleanCategories();

// ── Routes ───────────────────────────────────────────────────────────────────
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedTweaksIfNeeded();

  // ── System Info ────────────────────────────────────────────────────────────
  app.get("/api/system/info", async (_req, res) => {
    try {
      const [cpu, graphics, mem, memLayout, osInfo, disk, fsSize] =
        await Promise.all([
          si.cpu(),
          si.graphics(),
          si.mem(),
          si.memLayout(),
          si.osInfo(),
          si.diskLayout(),
          si.fsSize(),
        ]);

      const controllers = graphics.controllers || [];
      const discreteGpu = controllers.find((c) =>
        /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
      );
      const gpu = discreteGpu || controllers[0];

      let vramStr = "Unknown";
      if (gpu?.vram) {
        const mb =
          gpu.vram > 1024 * 1024 ? gpu.vram / (1024 * 1024) : gpu.vram;
        vramStr = mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb.toFixed(0)} MB`;
      }

      const memTypes = memLayout
        .map((m) => m.type || "")
        .filter((t) => t && t !== "Unknown");
      const ramType =
        memTypes.length > 0
          ? [...new Set(memTypes)].join("/")
          : mem.type || "Unknown";

      const primaryDisk = disk[0];
      const rootFs =
        fsSize.find((f) => f.mount === "C:" || f.mount === "/") || fsSize[0];

      res.json({
        cpu: { model: cpu.brand || cpu.manufacturer || "Unknown CPU", cores: cpu.cores || 0, speed: cpu.speed },
        gpu: { model: gpu?.model || "Unknown GPU", vram: vramStr },
        memory: {
          total: mem.total ? `${(mem.total / 1024 ** 3).toFixed(1)} GB` : "0 GB",
          used: mem.active ? `${(mem.active / 1024 ** 3).toFixed(1)} GB` : "0 GB",
          type: ramType,
        },
        system: {
          os: osInfo.distro || osInfo.platform || "Unknown",
          version: osInfo.release || "Unknown",
        },
        storage: {
          primaryDisk: primaryDisk?.name || primaryDisk?.device || "Unknown",
          totalSpace: rootFs ? `${(rootFs.size / 1024 ** 3).toFixed(1)} GB` : "0 GB",
          freeSpace: rootFs ? `${(rootFs.available / 1024 ** 3).toFixed(1)} GB` : "0 GB",
        },
      });
    } catch {
      res.json({
        cpu: { model: "Unknown CPU", cores: 0, speed: 0 },
        gpu: { model: "Unknown GPU", vram: "Unknown" },
        memory: { total: "0 GB", used: "0 GB", type: "Unknown" },
        system: { os: "Unknown", version: "Unknown" },
        storage: { primaryDisk: "Unknown", totalSpace: "0 GB", freeSpace: "0 GB" },
      });
    }
  });

  // ── Live System Usage (CPU %, RAM %, GPU %) ────────────────────────────────
  app.get("/api/system/usage", async (_req, res) => {
    try {
      const [load, mem, graphics, fsSize, diskIO] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics(),
        si.fsSize(),
        si.fsStats().catch(() => null as si.Systeminformation.FsStatsData | null),
      ]);

      const controllers = graphics.controllers || [];
      const gpu =
        controllers.find((c) =>
          /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
        ) || controllers[0];

      const rootFs =
        fsSize.find((f) => f.mount === "C:" || f.mount === "/") || fsSize[0];
      const diskUsePct = rootFs ? Math.round(rootFs.use || 0) : 0;

      const gpuTemp = (gpu as any)?.temperatureGpu;

      res.json({
        cpu: {
          usage: Math.round(load.currentLoad || 0),
          cores: (load.cpus || []).length,
        },
        ram: {
          usage: Math.round(((mem.active || 0) / (mem.total || 1)) * 100),
          usedGb: parseFloat(((mem.active || 0) / 1024 ** 3).toFixed(1)),
          totalGb: parseFloat(((mem.total || 0) / 1024 ** 3).toFixed(1)),
        },
        gpu: {
          usage: (gpu as any)?.utilizationGpu ?? null,
          model: gpu?.model || null,
          temp: gpuTemp && gpuTemp > 0 ? Math.round(gpuTemp) : null,
        },
        disk: {
          usage: diskUsePct,
          readMb: diskIO ? parseFloat(((diskIO.rx_sec || 0) / 1024 / 1024).toFixed(1)) : 0,
          writeMb: diskIO ? parseFloat(((diskIO.wx_sec || 0) / 1024 / 1024).toFixed(1)) : 0,
        },
      });
    } catch {
      res.json({
        cpu: { usage: 0, cores: 0 },
        ram: { usage: 0, usedGb: 0, totalGb: 0 },
        gpu: { usage: null, model: null, temp: null },
        disk: { usage: 0, readMb: 0, writeMb: 0 },
      });
    }
  });

  // ── Temperatures ───────────────────────────────────────────────────────────
  app.get("/api/system/temps", async (_req, res) => {
    try {
      // CPU must be >= 30°C — anything lower is an ambient/case sensor, not the CPU package
      const isValidCpuTemp = (t: unknown): t is number =>
        typeof t === "number" && isFinite(t) && t >= 30 && t < 115;
      const isValidGpuTemp = (t: unknown): t is number =>
        typeof t === "number" && isFinite(t) && t >= 20 && t < 120;

      const graphics = await si.graphics();
      const controllers = graphics.controllers || [];
      const gpu =
        controllers.find((c) =>
          /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
        ) || controllers[0];

      let cpuCurrent: number | null = null;
      let cpuMax: number | null = null;

      // On Windows: try PowerShell methods first in priority order.
      // systeminformation can only read CPU package temp on Linux/Mac reliably.
      if (process.platform === "win32") {
        const psScript = `
$result = $null

# Method 1: LibreHardwareMonitor WMI — most accurate, requires LHM installed/running
if (-not $result) {
  try {
    $sensors = Get-WmiObject -Namespace "root/LibreHardwareMonitor" -Class Sensor -EA Stop |
      Where-Object { $_.SensorType -eq "Temperature" -and $_.Name -match "CPU Package|CPU Core|CPU Total|Core #" }
    if ($sensors) {
      $vals = @($sensors) | ForEach-Object { [math]::Round($_.Value, 0) } | Where-Object { $_ -ge 30 -and $_ -lt 115 }
      if ($vals) { $result = ($vals | Measure-Object -Maximum).Maximum }
    }
  } catch {}
}

# Method 2: OpenHardwareMonitor WMI — accurate, requires OHM installed/running
if (-not $result) {
  try {
    $sensors = Get-WmiObject -Namespace "root/OpenHardwareMonitor" -Class Sensor -EA Stop |
      Where-Object { $_.SensorType -eq "Temperature" -and $_.Name -match "CPU Package|CPU Core|CPU Total|Core #" }
    if ($sensors) {
      $vals = @($sensors) | ForEach-Object { [math]::Round($_.Value, 0) } | Where-Object { $_ -ge 30 -and $_ -lt 115 }
      if ($vals) { $result = ($vals | Measure-Object -Maximum).Maximum }
    }
  } catch {}
}

# Method 3: MSAcpi — filter to CPU-labelled zones first, fall back to all zones
if (-not $result) {
  try {
    $zones = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -EA Stop
    $cpuZones = @($zones) | Where-Object { $_.InstanceName -match "CPU|PROC|CPUZ|CpuPackage|TZ0[01]" }
    if (-not $cpuZones -or $cpuZones.Count -eq 0) { $cpuZones = @($zones) }
    $vals = $cpuZones | ForEach-Object { [math]::Round($_.CurrentTemperature / 10 - 273.15, 0) } | Where-Object { $_ -ge 30 -and $_ -lt 115 }
    if ($vals) { $result = ($vals | Sort-Object -Descending)[0] }
  } catch {}
}

if ($result) { $result }`;
        const output = await runPowerShell(psScript, 12000).catch(() => "");
        const parsed = parseFloat(output.trim());
        if (isValidCpuTemp(parsed)) cpuCurrent = Math.round(parsed);
      }

      // Fallback: systeminformation (works on Linux/Mac, rarely on Windows)
      if (cpuCurrent === null) {
        const cpuTemp = await si.cpuTemperature().catch(() => ({
          main: null as number | null,
          socket: [] as number[],
          cores: [] as number[],
          max: null as number | null,
        }));
        if (isValidCpuTemp(cpuTemp.main)) {
          cpuCurrent = Math.round(cpuTemp.main);
        } else if (cpuTemp.socket?.length) {
          const valid = (cpuTemp.socket as number[]).filter(isValidCpuTemp);
          if (valid.length) cpuCurrent = Math.round(Math.max(...valid));
        }
        if (!cpuCurrent && cpuTemp.cores?.length) {
          const valid = (cpuTemp.cores as number[]).filter(isValidCpuTemp);
          if (valid.length) cpuCurrent = Math.round(valid.reduce((a: number, b: number) => a + b, 0) / valid.length);
        }
        const isValidMax = (t: unknown): t is number =>
          typeof t === "number" && isFinite(t) && t > 50 && t < 120;
        if (isValidMax(cpuTemp.max)) cpuMax = Math.round(cpuTemp.max);
      }

      const gpuTemp = (gpu as any)?.temperatureGpu ?? null;

      res.json({
        cpu: { current: cpuCurrent, max: cpuMax },
        gpu: { current: isValidGpuTemp(gpuTemp) ? Math.round(gpuTemp) : null },
      });
    } catch {
      res.json({ cpu: { current: null, max: null }, gpu: { current: null } });
    }
  });

  // ── Tweaks ─────────────────────────────────────────────────────────────────
  app.get("/api/tweaks", async (_req, res) => {
    res.json(await storage.getTweaks());
  });

  app.patch("/api/tweaks/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const updated = await storage.updateTweak(id, { isActive });
      if (!updated) return res.status(404).json({ message: "Tweak not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Tweaks: Detect from System ─────────────────────────────────────────────
  app.post("/api/tweaks/detect", async (_req, res) => {
    if (process.platform !== "win32") {
      return res.json({ active: 0, total: 0, results: {} });
    }
    try {
      // String.raw preserves single backslashes — needed for PS registry paths
      const psScript = String.raw`
function creg($p,$n,$v){try{$r=(Get-ItemProperty -Path $p -Name $n -EA Stop)."$n";if($r -eq $v){1}else{0}}catch{0}}
function csvc($n){try{if((Get-Service -Name $n -EA Stop).StartType -eq 'Disabled'){1}else{0}}catch{0}}
$d=@{}
$d['Debloat Windows']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsConsumerFeatures' 1)
$d['Disable Telemetry & Data Collection']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 0)
$d['Disable Advertising ID']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0)
$d['Disable Activity History & Timeline']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableActivityFeed' 0)
$d['Disable Customer Experience Improvement Program']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows' 'CEIPEnable' 0)
$d['Disable Windows Error Reporting']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' 'Disabled' 1)
$d['Disable Clipboard History & Cloud Sync']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'AllowClipboardHistory' 0)
$d['Disable Start Menu Suggestions & Tips']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' 'SystemPaneSuggestionsEnabled' 0)
$d['Maximum Performance Power Plan']=if(((powercfg /getactivescheme 2>$null)-join ' ') -match 'e9a42b02'){1}else{0}
$d['Disable SuperFetch / SysMain']=(csvc 'SysMain')
$d['Disable NTFS Access Timestamps']=try{if(((fsutil behavior query disablelastaccess)-join ' ') -match 'DisableLastAccess\s*=\s*[13]'){1}else{0}}catch{0}
$d['Disable Windows Performance Counters']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib' 'Disable Performance Counters' 4)
$d['Disable Windows File Indexing']=(csvc 'WSearch')
$d['Disable Multiplane Overlay (MPO)']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode' 5)
$d['Disable Hibernation']=(creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 0)
$d['Disable Background Apps (Legacy)']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsRunInBackground' 2)
$d['Optimize Visual Effects for Performance']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'VisualFXSetting' 2)
$d['Disable Cortana']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana' 0)
$d['Disable Mouse Acceleration']=(creg 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '0')
$d['Keep All CPU Cores Active (Unpark Cores)']=try{$q=((powercfg /query scheme_current sub_processor CPMINCORES 2>$null)-join ' ');if($q -match '0x00000064'){1}else{0}}catch{0}
$d['Minimum Priority for Background Processes']=(creg 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' 'Win32PrioritySeparation' 38)
$d['Disable GameBar']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0)
$d['Disable GameBar Background Recording']=(creg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0)
$d['Optimize for Windowed & Borderless Games']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'ForceEffectMode' 2)
$d['Enable Game Mode']=(creg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1)
$d['Enable Hardware Accelerated GPU Scheduling (HAGS)']=(creg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 2)
$d['Instant Menu Response (Zero Delay)']=(creg 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '0')
$d['Disable Full Screen Optimizations']=(creg 'HKCU:\System\GameConfigStore' 'GameDVR_FSEBehavior' 2)
$d['System Responsiveness & Network Throttling']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' 'SystemResponsiveness' 10)
$d['GPU & CPU Priority for Games']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' 'GPU Priority' 8)
$d['Fortnite Process High Priority']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\FortniteClient-Win64-Shipping.exe\PerfOptions' 'CpuPriorityClass' 3)
$d['Disable Dynamic Tick']=try{$bcd=(bcdedit /enum 2>$null)-join ' ';if($bcd -match 'disabledynamictick\s+Yes'){1}else{0}}catch{0}
$d["Disable Nagle's Algorithm"]=try{$all=Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' -EA Stop;$f=0;foreach($i in $all){try{if((Get-ItemProperty $i.PSPath 'TcpAckFrequency' -EA Stop).TcpAckFrequency -eq 1){$f=1;break}}catch{}};$f}catch{0}
$d['Disable Xbox Core Services']=(csvc 'XboxGipSvc')
$d['Disable IPv6']=(creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' 255)
$d['Prefer IPv4 over IPv6']=try{$v=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' -EA Stop).DisabledComponents;if($v -eq 32){1}else{0}}catch{0}
$d['Enable SSD TRIM Optimization']=try{$tr=(fsutil behavior query DisableDeleteNotify)-join ' ';if($tr -match '= 0'){1}else{0}}catch{0}
$d['Disable Web Search in Windows Search']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'BingSearchEnabled' 0)
$d['Disable Windows TCP Auto-Tuning']=try{$tcp=(netsh int tcp show global 2>$null)-join ' ';if($tcp -match 'Auto-Tuning.+disabled'){1}else{0}}catch{0}
$d['Disable Startup Program Delay']=(creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' 'StartupDelayInMSec' 0)
$d['Disable Windows Automatic Maintenance']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance' 'MaintenanceDisabled' 1)
$d['Disable Power Throttling']=(creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' 'PowerThrottlingOff' 1)
$d['Debloat Microsoft Edge']=(creg 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' 'HubsSidebarEnabled' 0)
$d['Debloat Google Chrome']=(creg 'HKLM:\SOFTWARE\Policies\Google\Chrome' 'BackgroundModeEnabled' 0)
$d['Optimize Discord for Gaming']=(creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Discord.exe\PerfOptions' 'CpuPriorityClass' 2)
$d | ConvertTo-Json -Compress`;

      const raw = await runPowerShell(psScript, 35000).catch(() => "{}");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const results: Record<string, number> = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const allTweaks = await storage.getTweaks();
      let activeCount = 0;

      for (const tweak of allTweaks) {
        const val = results[tweak.title];
        if (val !== undefined) {
          const isActive = val === 1;
          if (isActive) activeCount++;
          if (tweak.isActive !== isActive) {
            await storage.updateTweak(tweak.id, { isActive });
          }
        }
      }

      res.json({ active: activeCount, total: Object.keys(results).length, results });
    } catch (err) {
      res.status(500).json({ message: "Detection failed", error: String(err) });
    }
  });

  // ── Tweaks: Bulk Update ─────────────────────────────────────────────────────
  app.post("/api/tweaks/bulk", async (req, res) => {
    try {
      const { titles, isActive } = z
        .object({ titles: z.array(z.string()), isActive: z.boolean() })
        .parse(req.body);

      const allTweaks = await storage.getTweaks();
      const toUpdate =
        titles.length === 0
          ? allTweaks
          : allTweaks.filter((t) => titles.includes(t.title));

      let updated = 0;
      for (const tweak of toUpdate) {
        if (tweak.isActive !== isActive) {
          await storage.updateTweak(tweak.id, { isActive });
          updated++;
        }
      }
      res.json({ updated });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Cleaner: Scan ──────────────────────────────────────────────────────────
  app.get("/api/cleaner/scan", async (_req, res) => {
    try {
      const results = await Promise.all(
        CLEAN_CATEGORIES.map(async (cat) => {
          let totalSize = 0;
          let totalCount = 0;

          if (cat.id === "recycle" && process.platform === "win32") {
            const psOut = await runPowerShell(`
try {
  $shell = New-Object -ComObject Shell.Application -EA Stop
  $bin = $shell.Namespace(10)
  $items = @($bin.Items())
  [long]$size = 0
  foreach ($item in $items) { try { $size += [long]$item.Size } catch {} }
  "$size $($items.Count)"
} catch { "0 0" }`, 12000).catch(() => "0 0");
            const parts = psOut.trim().split(/\s+/);
            totalSize = Math.max(0, parseInt(parts[0]) || 0);
            totalCount = Math.max(0, parseInt(parts[1]) || 0);
          } else {
            for (const p of cat.paths) {
              const expanded = expandPath(p);
              try {
                await fs.promises.access(expanded);
                const { size, count } = await getDirSize(expanded);
                totalSize += size;
                totalCount += count;
              } catch {}
            }
          }

          return {
            id: cat.id,
            name: cat.name,
            description: cat.description,
            size: totalSize,
            sizeHuman: fmtSize(totalSize),
            fileCount: totalCount,
            found: totalSize > 0 || totalCount > 0,
          };
        })
      );

      const totalSize = results.reduce((s, r) => s + r.size, 0);
      const totalCount = results.reduce((s, r) => s + r.fileCount, 0);

      res.json({
        categories: results,
        totalSize,
        totalSizeHuman: fmtSize(totalSize),
        totalCount,
      });
    } catch (err) {
      res.status(500).json({ message: "Scan failed", error: String(err) });
    }
  });

  // ── Cleaner: Clean ─────────────────────────────────────────────────────────
  app.post("/api/cleaner/clean", async (req, res) => {
    try {
      const { ids } = z
        .object({ ids: z.array(z.string()).min(1) })
        .parse(req.body);

      let totalFreed = 0;
      const cleaned: string[] = [];

      for (const id of ids) {
        const cat = CLEAN_CATEGORIES.find((c) => c.id === id);
        if (!cat) continue;
        let freed = 0;

        const isWupdate = id === "wupdate" && process.platform === "win32";
        const isRecycle = id === "recycle" && process.platform === "win32";

        if (isWupdate) {
          await runCmd("net stop wuauserv 2>nul", 8000).catch(() => {});
        }

        if (isRecycle) {
          // Use Shell COM to measure size (file system access to $Recycle.Bin is blocked by Windows)
          const sizeOut = await runPowerShell(`
try {
  $shell = New-Object -ComObject Shell.Application -EA Stop
  $bin = $shell.Namespace(10)
  $items = @($bin.Items())
  [long]$size = 0
  foreach ($item in $items) { try { $size += [long]$item.Size } catch {} }
  $size
} catch { 0 }`, 12000).catch(() => "0");
          freed = Math.max(0, parseInt(sizeOut.trim()) || 0);
          await runPowerShell(`Clear-RecycleBin -Force -ErrorAction SilentlyContinue`, 15000).catch(() => {});
        } else {
          for (const p of cat.paths) {
            const expanded = expandPath(p);
            try {
              await fs.promises.access(expanded);
              freed += await deleteContents(expanded);
            } catch {}
          }
        }

        if (isWupdate) {
          await runCmd("net start wuauserv 2>nul", 8000).catch(() => {});
        }

        totalFreed += freed;
        if (freed > 0) cleaned.push(cat.name);
      }

      res.json({
        success: true,
        freed: totalFreed,
        freedHuman: fmtSize(totalFreed),
        cleaned,
      });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Clean failed", error: String(err) });
    }
  });

  // ── Cleaner: History ───────────────────────────────────────────────────────
  app.get("/api/cleaner/history", async (_req, res) => {
    try {
      const entries = await storage.getCleaningHistory();
      const totalFreed = entries.reduce((sum, e) => sum + e.freed, 0);
      const totalFreedHuman = fmtSize(totalFreed);
      res.json({ entries, totalFreed, totalFreedHuman });
    } catch {
      res.status(500).json({ message: "Failed to get history" });
    }
  });

  app.post("/api/cleaner/history", async (req, res) => {
    try {
      const { freed, freedHuman, count } = z
        .object({ freed: z.number(), freedHuman: z.string(), count: z.number() })
        .parse(req.body);
      const entry = { date: new Date().toISOString(), freed, freedHuman, count };
      await storage.addCleaningHistory(entry);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to add history" });
    }
  });

  // ── DNS ────────────────────────────────────────────────────────────────────
  app.get("/api/dns/current", async (_req, res) => {
    try {
      const provider = await storage.getSetting("dns_provider");
      res.json({ provider: provider || null });
    } catch {
      res.json({ provider: null });
    }
  });

  app.post("/api/dns/set", async (req, res) => {
    try {
      const { provider } = z
        .object({
          provider: z.enum([
            "cloudflare",
            "google",
            "opendns",
            "quad9",
            "nextdns",
            "default",
          ]),
        })
        .parse(req.body);

      const dns: Record<string, { primary: string; secondary: string }> = {
        cloudflare: { primary: "1.1.1.1", secondary: "1.0.0.1" },
        google: { primary: "8.8.8.8", secondary: "8.8.4.4" },
        opendns: { primary: "208.67.222.222", secondary: "208.67.220.220" },
        quad9: { primary: "9.9.9.9", secondary: "149.112.112.112" },
        nextdns: { primary: "45.90.28.0", secondary: "45.90.30.0" },
        default: { primary: "Auto", secondary: "Auto" },
      };

      await storage.setSetting("dns_provider", provider);

      if (process.platform === "win32") {
        const dnsInfo = dns[provider];
        let psScript: string;
        if (provider === "default") {
          psScript = `
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
foreach ($a in $adapters) {
  Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses
}
Write-Host "DNS reset to automatic (DHCP) on all active adapters."`;
        } else {
          psScript = `
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
foreach ($a in $adapters) {
  Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ('${dnsInfo.primary}','${dnsInfo.secondary}')
}
Write-Host "DNS set to ${provider} (${dnsInfo.primary} / ${dnsInfo.secondary}) on all active adapters."`;
        }
        const output = await runPowerShell(psScript, 15000);
        return res.json({ success: true, provider, ...dnsInfo, output });
      }

      res.json({ success: true, provider, ...dns[provider] });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Restore Points ─────────────────────────────────────────────────────────
  app.post("/api/restore/create", async (req, res) => {
    try {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
      const timestamp = new Date().toISOString();

      if (process.platform === "win32") {
        const safeName = name.replace(/'/g, "''");
        const psScript = `
Enable-ComputerRestore -Drive "C:\\"
Checkpoint-Computer -Description '${safeName}' -RestorePointType 'MODIFY_SETTINGS'
Write-Host "Restore point created successfully."`;
        const output = await runPowerShell(psScript, 30000);
        const failed = /error|exception|access.?denied|cannot/i.test(output) && !/successfully/i.test(output);
        if (failed) {
          return res.status(500).json({
            message: `Failed to create restore point: ${output || "Administrator privileges required."}`,
          });
        }
        return res.json({
          success: true,
          name,
          timestamp,
          message: `Restore point "${name}" created successfully.`,
          output,
        });
      }

      res.json({
        success: true,
        name,
        timestamp,
        message: `Restore point "${name}" queued. Run as Administrator on Windows.`,
      });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/restore/list", async (_req, res) => {
    if (process.platform === "win32") {
      const psScript = `Get-ComputerRestorePoint | Select-Object Description, CreationTime | ConvertTo-Json -Compress`;
      const output = await runPowerShell(psScript, 10000);
      try {
        const points = JSON.parse(output);
        return res.json({ points: Array.isArray(points) ? points : [points] });
      } catch {
        return res.json({ points: [] });
      }
    }
    res.json({ points: [] });
  });

  // ── Utilities ──────────────────────────────────────────────────────────────
  app.post("/api/utilities/run", async (req, res) => {
    try {
      const { action } = z
        .object({
          action: z.enum([
            "sfc","dism","checkdisk","network-reset","flush-dns","release-ip","renew-ip",
            "restart-explorer","disk-cleanup","storage-sense-on","storage-sense-off",
            "fast-startup-on","fast-startup-off","windows-update-default","windows-update-security",
            "location-on","location-off","open-system-restore",
          ]),
        })
        .parse(req.body);

      const commands: Record<string, { name: string; command: string; description: string }> = {
        sfc: { name: "System File Checker", command: "sfc /scannow", description: "Scans and repairs corrupted Windows system files. Requires Administrator." },
        dism: { name: "DISM Health Restore", command: "DISM /Online /Cleanup-Image /RestoreHealth", description: "Repairs the Windows image. Requires Administrator and internet." },
        checkdisk: { name: "Check Disk", command: "chkdsk C: /f /r /x", description: "Checks and repairs disk errors. Schedules for next restart. Requires Administrator." },
        "network-reset": { name: "Network Reset", command: "netsh winsock reset && netsh int ip reset && ipconfig /release && ipconfig /flushdns && ipconfig /renew", description: "Resets all network settings. Restart required." },
        "flush-dns": { name: "Flush DNS Cache", command: "ipconfig /flushdns", description: "Clears the local DNS resolver cache." },
        "release-ip": { name: "Release IP Address", command: "ipconfig /release", description: "Releases the current IP address from DHCP." },
        "renew-ip": { name: "Renew IP Address", command: "ipconfig /renew", description: "Requests a new IP address from DHCP." },
        "restart-explorer": { name: "Restart Explorer", command: `powershell -NonInteractive -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800; Start-Process explorer"`, description: "Restarts Windows Explorer (taskbar and desktop)." },
        "disk-cleanup": { name: "Disk Cleanup", command: "cleanmgr", description: "Runs Windows built-in Disk Cleanup utility." },
        "storage-sense-on": { name: "Enable Storage Sense", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 1 /f', description: "Enables Storage Sense automatic cleanup." },
        "storage-sense-off": { name: "Disable Storage Sense", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 0 /f', description: "Disables Storage Sense automatic cleanup." },
        "fast-startup-on": { name: "Enable Fast Startup", command: 'powercfg /h on && reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 1 /f', description: "Enables Fast Startup (hybrid boot)." },
        "fast-startup-off": { name: "Disable Fast Startup", command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f', description: "Disables Fast Startup for clean shutdowns." },
        "windows-update-default": { name: "Windows Update Default", command: 'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" /f 2>nul & echo Default Windows Update restored', description: "Restores default Windows Update behavior." },
        "windows-update-security": { name: "Windows Update Security Only", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 3 /f && reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 0 /f', description: "Restricts Windows Update to notify-before-install mode (security updates applied manually)." },
        "location-on": { name: "Enable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 0 /f & sc config lfsvc start= auto & net start lfsvc 2>nul & echo Location Services enabled.', description: "Re-enables Windows Location Services." },
        "location-off": { name: "Disable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 1 /f & sc config lfsvc start= disabled & net stop lfsvc 2>nul & echo Location Services disabled.', description: "Completely disables Windows Location Services." },
        "open-system-restore": { name: "Open System Restore", command: "rstrui.exe", description: "Opens the Windows System Restore wizard." },
      };

      const info = commands[action];

      if (process.platform !== "win32") {
        return res.json({ success: true, action, ...info, output: "Windows only." });
      }

      const TERMINAL_ACTIONS = new Set([
        "sfc", "dism", "checkdisk", "network-reset",
      ]);
      const GUI_ACTIONS = new Set(["open-system-restore", "disk-cleanup"]);

      if (GUI_ACTIONS.has(action)) {
        spawn(info.command, [], { detached: true, stdio: "ignore", shell: true });
        return res.json({ success: true, action, ...info, output: "Launched." });
      }

      if (TERMINAL_ACTIONS.has(action)) {
        openTerminalWithCommand(info.command);
        return res.json({ success: true, action, ...info, output: "Opened in new terminal window." });
      }

      const output = await runCmd(info.command, 20000);
      return res.json({ success: true, action, ...info, output: output || "Done." });

    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Settings ───────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    try {
      const all = await storage.getAllSettings();
      res.json({
        theme: all.theme || "black-red",
        trayIcon: all.trayIcon === "true",
        analytics: all.analytics === "true",
      });
    } catch {
      res.json({ theme: "black-red", trayIcon: false, analytics: false });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      for (const [key, value] of Object.entries(body)) {
        await storage.setSetting(key, String(value));
      }
      const all = await storage.getAllSettings();
      res.json({
        theme: all.theme || "black-red",
        trayIcon: all.trayIcon === "true",
        analytics: all.analytics === "true",
      });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Updates ────────────────────────────────────────────────────────────────
  app.get("/api/check-update", async (_req, res) => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/JaidenGoode/JGoode-s-AIO-PC-Tool/releases/latest"
      );
      if (!response.ok) throw new Error("GitHub API unavailable");
      const release = (await response.json()) as {
        tag_name: string;
        name: string;
        html_url: string;
        published_at: string;
      };
      const currentVersion = "2.5.0";
      const latestVersion = release.tag_name?.replace(/^v/, "") || currentVersion;
      res.json({
        currentVersion,
        latestVersion,
        isUpToDate: currentVersion >= latestVersion,
        releaseUrl: release.html_url,
        releaseName: release.name,
        publishedAt: release.published_at,
      });
    } catch {
      res.json({
        currentVersion: "2.5.0",
        latestVersion: "2.5.0",
        isUpToDate: true,
        releaseUrl: "",
        releaseName: "",
        publishedAt: null,
      });
    }
  });

  // ── GitHub Integration ────────────────────────────────────────────────────
  app.get("/api/github/user", async (_req, res) => {
    try {
      const user = await getGitHubUser();
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "GitHub auth failed" });
    }
  });

  app.get("/api/github/repos", async (_req, res) => {
    try {
      const repos = await listUserRepos();
      res.json(repos);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to list repos" });
    }
  });

  // Push source files to a GitHub repo
  app.post("/api/github/push", async (req, res) => {
    try {
      const { owner, repo, createNew, repoName, description, isPrivate } = z.object({
        owner: z.string(),
        repo: z.string().optional(),
        createNew: z.boolean().optional(),
        repoName: z.string().optional(),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
      }).parse(req.body);

      let targetOwner = owner;
      let targetRepo = repo || repoName || "JGoodeA.I.O_PC_Tool";

      if (createNew && repoName) {
        const newRepo = await createRepo(
          repoName,
          description || "JGoode A.I.O PC Tool — All-in-one Windows optimization suite with 47 PowerShell tweaks, live hardware monitoring, and full theme customization.",
          isPrivate || false
        );
        targetOwner = newRepo.full_name.split("/")[0];
        targetRepo = newRepo.name;
      }

      const root = process.cwd();

      const SOURCE_DIRS = ["client", "electron", "server", "shared", "script"];
      const ROOT_FILES = [
        "package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts",
        "postcss.config.js", "drizzle.config.ts", "components.json", "replit.md", ".gitignore",
        "electron-builder.json", "BUILD_EXE.bat",
      ];

      const MAX_FILE_SIZE = 512 * 1024;

      const filesToPush: { path: string; content: Buffer }[] = [];

      function collectDir(dir: string, base: string) {
        if (!fs.existsSync(path.join(root, dir))) return;
        const entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
        for (const entry of entries) {
          const relPath = base ? `${base}/${entry.name}` : entry.name;
          const fullPath = path.join(root, dir, entry.name);
          if (entry.isDirectory()) {
            collectDir(`${dir}/${entry.name}`, relPath);
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > MAX_FILE_SIZE) continue;
              const content = fs.readFileSync(fullPath);
              filesToPush.push({ path: relPath, content });
            } catch { /* skip unreadable files */ }
          }
        }
      }

      for (const dir of SOURCE_DIRS) {
        collectDir(dir, dir);
      }

      for (const file of ROOT_FILES) {
        const fullPath = path.join(root, file);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath);
            filesToPush.push({ path: file, content });
          } catch { /* skip */ }
        }
      }

      const result = await pushFilesViaTree(
        targetOwner,
        targetRepo,
        filesToPush,
        "chore: sync via JGoode A.I.O PC Tool"
      );

      res.json({
        success: true,
        repo: result.repoUrl,
        pushed: result.pushed,
        skipped: result.skipped,
        errors: result.errors,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Push failed" });
    }
  });

  return httpServer;
}
