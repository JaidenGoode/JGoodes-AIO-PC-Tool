import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import si from "systeminformation";
import { getGitHubUser, listUserRepos, createRepo, pushFilesViaTree, isTokenConfigured } from "./github";
import { TWEAKS_SEED } from "@shared/tweaks-seed";
import fs from "fs";
import path from "path";
import os from "os";
import { exec, spawn } from "child_process";

// ── PowerShell / cmd helpers ──────────────────────────────────────────────────
function runPowerShell(script: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `jgoode-ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`);
    try {
      fs.writeFileSync(tmpFile, script, "utf-8");
    } catch {
      resolve("");
      return;
    }
    exec(
      `powershell.exe -NonInteractive -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`,
      { timeout: timeoutMs, windowsHide: true },
      (_err: any, stdout: any, stderr: any) => {
        try { fs.unlinkSync(tmpFile); } catch {}
        resolve((stdout || stderr || "").trim());
      }
    );
  });
}

function runCmd(command: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { shell: "cmd.exe", timeout: timeoutMs, windowsHide: true } as any,
      (_err: any, stdout: any, stderr: any) => resolve((stdout || stderr || "").trim())
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
    } else {
      const existingTitles = new Set(existing.map((t) => t.title));
      let added = 0;
      for (const tweak of TWEAKS_SEED) {
        if (!existingTitles.has(tweak.title)) {
          await storage.createTweak(tweak);
          added++;
        }
      }
      if (added > 0) {
        console.log(`[seed] Added ${added} new tweaks`);
      }
    }
  } catch (err) {
    console.error("[seed] Failed to seed tweaks:", err);
  }
}

// ── Detection cache (last known good result — survives transient PS failures) ──
let _detectCache: { results: Record<string, number>; ts: number } | null = null;

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
    // Process sequentially to avoid overwhelming the filesystem
    for (const item of items) {
      const full = path.join(dirPath, item);
      try {
        const stat = await fs.promises.lstat(full);
        const itemSize = stat.isDirectory()
          ? (await getDirSize(full)).size
          : stat.size;

        // Strategy 1: native fs.rm (works for most files)
        try {
          await fs.promises.rm(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          freed += itemSize;
          continue;
        } catch {}

        // Strategy 2: for directories — try deleting contents first, then the dir
        if (stat.isDirectory()) {
          try {
            const sub = await deleteContents(full);
            freed += sub;
            await fs.promises.rmdir(full).catch(() => {});
            continue;
          } catch {}
        }

        // Strategy 3: cmd del/rd as a last resort for stubborn files (Windows only)
        if (process.platform === "win32") {
          try {
            if (stat.isDirectory()) {
              await runCmd(`rd /s /q "${full}" 2>nul`, 5000);
            } else {
              await runCmd(`del /f /q "${full}" 2>nul`, 5000);
            }
            freed += itemSize;
          } catch {}
        }
      } catch {}
    }
  } catch {}
  return freed;
}

interface CleanCategory {
  id: string;
  name: string;
  description: string;
  paths: string[];
  globDir?: string;
  globPattern?: string;
  // Scans/cleans a specific named subdir within each child of the listed parent dirs.
  // e.g. Firefox: parent=Profiles dir, subdir="cache2" → cleans only cache inside each profile.
  subDirScan?: { parent: string; subdir: string }[];
}

// Expands subDirScan entries into actual on-disk cache paths
async function expandSubDirScan(items: { parent: string; subdir: string }[]): Promise<string[]> {
  const result: string[] = [];
  for (const item of items) {
    try {
      const children = await fs.promises.readdir(item.parent, { withFileTypes: true });
      for (const child of children) {
        if (child.isDirectory()) {
          result.push(path.join(item.parent, child.name, item.subdir));
        }
      }
    } catch {}
  }
  return result;
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
        description: "Chrome, Edge, and Opera GX browser cache files (Default + extra profiles)",
        paths: [
          // Google Chrome — Default profile + extra profiles
          path.join(local, "Google", "Chrome", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Google", "Chrome", "User Data", "Default", "Code Cache"),
          path.join(local, "Google", "Chrome", "User Data", "Default", "GPUCache"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 1", "Cache", "Cache_Data"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 1", "Code Cache"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 1", "GPUCache"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 2", "Cache", "Cache_Data"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 2", "Code Cache"),
          path.join(local, "Google", "Chrome", "User Data", "Profile 2", "GPUCache"),
          // Microsoft Edge
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "GPUCache"),
          // Opera GX — checks both AppData\Roaming and AppData\Local
          path.join(roaming, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "Code Cache"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "GPUCache"),
          path.join(local, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
          path.join(local, "Opera Software", "Opera GX Stable", "Code Cache"),
          path.join(local, "Opera Software", "Opera GX Stable", "GPUCache"),
        ],
      },
      {
        id: "thumbnails",
        name: "Thumbnail Cache",
        description: "Windows Explorer thumbnail cache files (thumbcache_*.db)",
        paths: [],
        globDir: path.join(local, "Microsoft", "Windows", "Explorer"),
        globPattern: "thumbcache_*.db",
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
        description: "Windows system CBS, DISM, MoSetup, and Windows Update log files",
        paths: [
          "C:\\Windows\\Logs\\CBS",
          "C:\\Windows\\Logs\\DISM",
          "C:\\Windows\\Logs\\MoSetup",
          "C:\\Windows\\Panther",
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
        id: "discord",
        name: "Discord Cache",
        description: "Discord app cache, GPU cache, and code cache files",
        paths: [
          path.join(roaming, "discord", "Cache", "Cache_Data"),
          path.join(roaming, "discord", "Code Cache"),
          path.join(roaming, "discord", "GPUCache"),
          path.join(roaming, "discord", "DawnCache"),
          path.join(local, "Discord", "Cache", "Cache_Data"),
          path.join(local, "Discord", "Code Cache"),
          path.join(local, "Discord", "GPUCache"),
        ],
      },
      {
        id: "spotify",
        name: "Spotify Cache",
        description: "Spotify local audio and image cache (can grow to several GB)",
        paths: [
          path.join(local, "Spotify", "Storage"),
          path.join(local, "Spotify", "Data"),
          path.join(roaming, "Spotify", "Storage"),
          path.join(roaming, "Spotify", "Users"),
        ],
      },
      {
        id: "gamelaunchers",
        name: "Game Launcher Cache",
        description: "Steam store page cache and Epic Games Launcher web cache files",
        paths: [
          path.join(local, "Steam", "htmlcache", "Cache", "Cache_Data"),
          path.join(local, "Steam", "htmlcache", "Code Cache"),
          path.join(local, "Steam", "htmlcache", "GPUCache"),
          path.join(local, "EpicGamesLauncher", "Saved", "webcache_4430"),
          path.join(local, "EpicGamesLauncher", "Saved", "Logs"),
          path.join(local, "EpicGamesLauncher", "Saved", "webcache"),
        ],
      },
      {
        id: "deliveryopt",
        name: "Delivery Optimization Cache",
        description: "Windows P2P update distribution cache used to share updates with other PCs",
        paths: [
          "C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization\\Cache",
          "C:\\Windows\\SoftwareDistribution\\DeliveryOptimization",
        ],
      },
      {
        id: "adobe",
        name: "Adobe Media Cache",
        description: "Adobe Premiere, After Effects, and Media Encoder preview and media cache files (can be many GB)",
        paths: [
          path.join(roaming, "Adobe", "Common", "Media Cache"),
          path.join(roaming, "Adobe", "Common", "Media Cache Files"),
          path.join(local, "Adobe", "Common", "Media Cache"),
          path.join(local, "Adobe", "Common", "Media Cache Files"),
          path.join(local, "Adobe", "After Effects CC", "media cache"),
          path.join(roaming, "Adobe", "After Effects CC", "media cache"),
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
          ? Array.from(new Set(memTypes)).join("/")
          : (mem as any).type || "Unknown";

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
      const psScript = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
function creg($p,$n,$v){
  try{
    $r=(Get-ItemProperty -Path $p -Name $n -ErrorAction Stop)."$n"
    if($r -eq $v){return 1}else{return 0}
  }catch{return 0}
}
function csvc($n){
  try{
    $s=Get-Service -Name $n -ErrorAction Stop
    if($s.StartType -eq 'Disabled'){return 1}else{return 0}
  }catch{return 0}
}

$d=[ordered]@{}

# Privacy
$d['Disable Telemetry & Data Collection']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 0
$d['Disable Advertising ID']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
$d['Disable Activity History & Timeline']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableActivityFeed' 0
$d['Disable Customer Experience Improvement Program']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows' 'CEIPEnable' 0
$d['Disable Windows Error Reporting']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' 'Disabled' 1
$d['Disable Clipboard History & Cloud Sync']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'AllowClipboardHistory' 0
$d['Disable Start Menu Suggestions & Tips']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' 'SystemPaneSuggestionsEnabled' 0
$d['Disable Windows Copilot & AI Features']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot' 1
$d['Disable Lock Screen Suggestions & Ads']=creg 'HKCU:\Software\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsSpotlightFeatures' 1

# Performance
try{$scheme=((powercfg /getactivescheme 2>$null) -join ' ');$d['Maximum Performance Power Plan']=if($scheme -match 'e9a42b02'){1}else{0}}catch{$d['Maximum Performance Power Plan']=0}
$d['Disable SuperFetch / SysMain']=csvc 'SysMain'
try{$fsu=((fsutil behavior query disablelastaccess 2>$null) -join ' ');$d['Disable NTFS Access Timestamps']=if($fsu -match 'DisableLastAccess\w*\s*=\s*[1-9]'){1}else{0}}catch{$d['Disable NTFS Access Timestamps']=0}
$d['Disable Windows Performance Counters']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib' 'Disable Performance Counters' 4
$d['Disable Windows File Indexing']=csvc 'WSearch'
$d['Disable Multiplane Overlay (MPO)']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode' 5
$d['Disable Hibernation']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 0
$d['Disable Background Apps (Legacy)']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsRunInBackground' 2
$d['Optimize Visual Effects for Performance']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'VisualFXSetting' 2
$d['Disable Cortana']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana' 0

# Gaming
$d['Disable Mouse Acceleration']=creg 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '0'
try{$cpm=((powercfg /query scheme_current sub_processor CPMINCORES 2>$null) -join ' ');$d['Keep All CPU Cores Active (Unpark Cores)']=if($cpm -match 'Current AC Power Setting Index:\s*0x00000064'){1}else{0}}catch{$d['Keep All CPU Cores Active (Unpark Cores)']=0}
$d['Minimum Priority for Background Processes']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' 'Win32PrioritySeparation' 38
$d['Disable GameBar']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0
$d['Disable GameBar Background Recording']=creg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0
$d['Optimize for Windowed & Borderless Games']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'ForceEffectMode' 2
$d['Enable Game Mode']=creg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1
$d['Enable Hardware Accelerated GPU Scheduling (HAGS)']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 2
$d['Instant Menu Response (Zero Delay)']=creg 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '0'
$d['Disable Full Screen Optimizations']=creg 'HKCU:\System\GameConfigStore' 'GameDVR_FSEBehavior' 2
$d['System Responsiveness & Network Throttling']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' 'SystemResponsiveness' 10
$d['Maximum Priority for Games']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' 'Priority' 6
$d['Fortnite Process High Priority']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\FortniteClient-Win64-Shipping.exe\PerfOptions' 'CpuPriorityClass' 3
try{$bcd=((bcdedit /enum 2>$null) -join ' ');$d['Disable Dynamic Tick']=if($bcd -match 'disabledynamictick\s+Yes'){1}else{0}}catch{$d['Disable Dynamic Tick']=0}
try{$ifaces=Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' -EA Stop;$nag=0;foreach($i in $ifaces){try{if((Get-ItemProperty $i.PSPath 'TcpAckFrequency' -EA Stop).TcpAckFrequency -eq 1){$nag=1;break}}catch{}};$d["Disable Nagle's Algorithm"]=$nag}catch{$d["Disable Nagle's Algorithm"]=0}
$d['Disable Xbox Core Services']=csvc 'XboxGipSvc'

# System / Network
$d['Disable IPv6']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' 255
try{$ipv6v=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' -EA Stop).DisabledComponents;$d['Prefer IPv4 over IPv6']=if($ipv6v -eq 32){1}else{0}}catch{$d['Prefer IPv4 over IPv6']=0}
try{$trim=((fsutil behavior query DisableDeleteNotify 2>$null) -join ' ');$d['Enable SSD TRIM Optimization']=if($trim -match '= 0'){1}else{0}}catch{$d['Enable SSD TRIM Optimization']=0}
$d['Disable Web Search in Windows Search']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'BingSearchEnabled' 0
try{$tcp=((netsh int tcp show global 2>$null) -join ' ');$d['Disable Windows TCP Auto-Tuning']=if($tcp -match 'Auto-Tuning.+disabled'){1}else{0}}catch{$d['Disable Windows TCP Auto-Tuning']=0}
$d['Disable Startup Program Delay']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' 'StartupDelayInMSec' 0
$d['Disable Windows Automatic Maintenance']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance' 'MaintenanceDisabled' 1
$d['Disable Power Throttling']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' 'PowerThrottlingOff' 1
$d['Disable Remote Assistance']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance' 'fAllowToGetHelp' 0
$d['Disable Phone Link & Mobile Sync']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableCdp' 0

# Browser
$d['Debloat Microsoft Edge']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' 'HubsSidebarEnabled' 0
$d['Debloat Google Chrome']=creg 'HKLM:\SOFTWARE\Policies\Google\Chrome' 'HardwareAccelerationModeEnabled' 0
$d['Optimize Discord for Gaming']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Discord.exe\PerfOptions' 'CpuPriorityClass' 2

# Opera GX: check hardware acceleration AND GX sounds disabled in Preferences
try{
  $opPref="$env:APPDATA\Opera Software\Opera GX Stable\Preferences"
  if(Test-Path $opPref){
    $opJson=Get-Content $opPref -Raw -Encoding UTF8 | ConvertFrom-Json
    $hwOff=$opJson.system -and $opJson.system.hardware_acceleration_mode_previous -eq $false
    $sndOff=$opJson.gx_corner -and $opJson.gx_corner.sounds_enabled -eq $false
    if($hwOff -and $sndOff){$d['Debloat Opera GX']=1}else{$d['Debloat Opera GX']=0}
  }else{$d['Debloat Opera GX']=0}
}catch{$d['Debloat Opera GX']=0}

# Network Power Saving
try{
  $adapters=Get-NetAdapter -Physical -EA Stop
  $pmOk=1
  foreach($a in $adapters){
    try{
      $pm=Get-NetAdapterPowerManagement -Name $a.Name -EA Stop
      if($pm.WakeOnMagicPacket -ne 'Disabled'){$pmOk=0;break}
    }catch{}
  }
  $d['Disable Network Power Saving']=$pmOk
}catch{$d['Disable Network Power Saving']=0}

# Performance (Cortex Disk Cache & Desktop Menu)
$d['Auto-End Unresponsive Programs']=creg 'HKCU:\Control Panel\Desktop' 'AutoEndTasks' '1'
try{$dfTask=schtasks /Query /TN "Microsoft\Windows\Defrag\ScheduledDefrag" /FO CSV 2>$null;$d['Disable Scheduled Disk Defragmentation']=if($dfTask -match 'Disabled'){1}else{0}}catch{$d['Disable Scheduled Disk Defragmentation']=0}
$d['Keep Kernel & Drivers in RAM']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' 'DisablePagingExecutive' 1
try{$mc=(Get-MMAgent -EA Stop).MemoryCompression;$d['Disable Memory Compression']=if($mc -eq $false){1}else{0}}catch{$d['Disable Memory Compression']=0}
$d['Release Unused DLLs from Memory']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' 'AlwaysUnloadDLL' 1
try{$svch=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control' 'SvcHostSplitThresholdInKB' -EA Stop).SvcHostSplitThresholdInKB;$d['Svchost Process Isolation']=if($svch -gt 1000000){1}else{0}}catch{$d['Svchost Process Isolation']=0}
$d['Disable 8.3 Short File Names']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' 'NtfsDisable8dot3NameCreation' 1
$d['Optimize Boot Configuration']=creg 'HKLM:\SOFTWARE\Microsoft\Dfrg\BootOptimizeFunction' 'Enable' 'Y'
$d['Increase System I/O Performance']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' 'IoPageLockLimit' 983040

# System (Cortex Desktop Menu & Network)
$d['Speed Up System Shutdown']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control' 'WaitToKillServiceTimeout' '2000'
$d['Disable Taskbar & Menu Animations']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarAnimations' 0
# Startup disk check: detect if C: is excluded from autocheck via chkntfs
try{$cntfsOut=(chkntfs C: 2>&1) -join ' ';$d['Disable Startup Disk Check']=if($cntfsOut -match 'excluded|will not be checked|not scheduled'){1}else{0}}catch{$d['Disable Startup Disk Check']=0}
$d['Reduce Taskbar Preview Delay']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'ExtendedUIHoverTime' 100
$d['Disable AutoPlay for External Devices']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' 'NoDriveTypeAutoRun' 255
$d['Disable Notification Center']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' 0
$d['Reduce Keyboard Input Delay']=creg 'HKCU:\Control Panel\Keyboard' 'KeyboardDelay' '0'
$d['Increase Network Buffer Size']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' 'SizReqBuf' 65535
$d['Optimize TCP/IP Network Stack']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' 'DefaultTTL' 64
$d['Optimize DNS Resolution']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' 'MaxCacheTtl' 86400
$d['Unlock Reserved Network Bandwidth']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched' 'NonBestEffortLimit' 0
$d['Increase Browser Connection Limits']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' 'MaxConnectionsPerServer' 16

# Services
$d['Disable BranchCache (PeerDistSvc)']=csvc 'PeerDistSvc'
$d['Disable iSCSI Initiator (MSiSCSI)']=csvc 'MSiSCSI'
$d['Disable SNMP Trap (SNMPTRAP)']=csvc 'SNMPTRAP'
$d['Disable Certificate Propagation (CertPropSvc)']=csvc 'CertPropSvc'
$d['Disable ActiveX Installer (AxInstSV)']=csvc 'AxInstSV'
$d['Disable Application Management (AppMgmt)']=csvc 'AppMgmt'
$d['Disable Remote Registry (RemoteRegistry)']=csvc 'RemoteRegistry'
$d['Disable Smart Card Removal Policy (SCPolicySvc)']=csvc 'SCPolicySvc'
$d['Disable WebDAV Client (WebClient)']=csvc 'WebClient'
$d['Disable Windows Remote Management (WinRM)']=csvc 'WinRM'
$d['Disable Offline Files (CscService)']=csvc 'CscService'
$d['Disable Peer Name Resolution (PNRPsvc)']=csvc 'PNRPsvc'
$d['Disable Peer Networking (p2psvc)']=csvc 'p2psvc'
$d['Disable Peer Networking Identity (p2pimsvc)']=csvc 'p2pimsvc'

# Network
$d['Disable Delivery Optimization Service']=csvc 'DoSvc'
$d['Disable Windows Connect Now (wcncsvc)']=csvc 'wcncsvc'
$d['Disable LLMNR Protocol']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient' 'EnableMulticast' 0
$d['Disable mDNS Multicast']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' 'EnableMDNS' 0

# NetBIOS: check all IP-enabled adapters via WMI
try{
  $nbOff=1
  $nbAdapters=Get-WmiObject Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' -EA Stop
  foreach($nb in $nbAdapters){if($nb.TcpipNetbiosOptions -ne 2){$nbOff=0;break}}
  $d['Disable NetBIOS over TCP/IP']=$nbOff
}catch{$d['Disable NetBIOS over TCP/IP']=0}

# SMBv1: check server config
try{$smb=(Get-SmbServerConfiguration -EA Stop).EnableSMB1Protocol;$d['Disable SMBv1 Protocol']=if($smb -eq $false){1}else{0}}catch{$d['Disable SMBv1 Protocol']=0}

# LSO: check LsoV2IPv4/LsoV2IPv6 — the correct Get-NetAdapterLso property names
try{
  $lsoOff=0
  $lsoAdapters=Get-NetAdapter -Physical -EA Stop
  foreach($la in $lsoAdapters){
    try{
      $lso=Get-NetAdapterLso -Name $la.Name -EA Stop
      $v4=$lso.LsoV2IPv4; $v6=$lso.LsoV2IPv6
      $v4off=($v4 -eq $false)-or($v4 -eq 0)-or("$v4" -eq 'Disabled')
      $v6off=($v6 -eq $false)-or($v6 -eq 0)-or("$v6" -eq 'Disabled')
      if($v4off -and $v6off){$lsoOff=1;break}
    }catch{}
  }
  $d['Disable Large Send Offload (LSO)']=$lsoOff
}catch{$d['Disable Large Send Offload (LSO)']=0}

# RSS: case-insensitive match on netsh tcp global output
try{$rssOut=(netsh int tcp show global 2>$null) -join ' ';$d['Enable Receive Side Scaling (RSS)']=if($rssOut -imatch 'Receive-Side Scaling.+enabled'){1}else{0}}catch{$d['Enable Receive Side Scaling (RSS)']=0}

# More services
$d['Disable Print Spooler (Spooler)']=csvc 'Spooler'
$d['Disable Fax Service (Fax)']=csvc 'Fax'
$d['Disable Distributed Link Tracking (TrkWks)']=csvc 'TrkWks'
$d['Disable Program Compatibility Assistant (PcaSvc)']=csvc 'PcaSvc'
$d['Disable Touch Keyboard Service (TabletInputService)']=csvc 'TabletInputService'
$d['Disable Windows Insider Service (wisvc)']=csvc 'wisvc'

# Gaming (additional)
try{$ter=(netsh interface teredo show state 2>$null) -join ' ';$d['Disable Teredo IPv6 Tunneling']=if($ter -match 'disabled'){1}else{0}}catch{$d['Disable Teredo IPv6 Tunneling']=0}
try{$bcd=(bcdedit /enum 2>$null) -join ' ';$d['Disable HPET (Platform Clock)']=if($bcd -match 'useplatformclock\s+No'){1}else{0}}catch{$d['Disable HPET (Platform Clock)']=0}
$d['Disable Auto-Restart After Windows Updates']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoRebootWithLoggedOnUsers' 1
# Network (additional)
try{$6t=(netsh interface 6to4 show state 2>$null) -join ' ';$d['Disable 6to4 & ISATAP Tunneling']=if($6t -match 'disabled'){1}else{0}}catch{$d['Disable 6to4 & ISATAP Tunneling']=0}
# Services (additional)
$d['Disable IP Helper Service (iphlpsvc)']=csvc 'iphlpsvc'
$d['Disable Diagnostic Policy Service (DPS)']=csvc 'DPS'
$d['Disable Connected Devices Platform (CDPSvc)']=csvc 'CDPSvc'
# Performance (additional)
$d['Clear Page File on Shutdown']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' 'ClearPageFileAtShutdown' 1
$d['Disable Transparency Effects']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 0

# Gaming (Razer Cortex Speed Up style)
try{
  $usbGuid="2a737441-1930-4402-8d77-b2bebba308a3"
  $usbSub="48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
  $usbOut=(powercfg /query SCHEME_CURRENT $usbGuid $usbSub 2>$null) -join ' '
  $d['Disable USB Selective Suspend']=if($usbOut -match 'Current AC Power Setting Index: 0x00000000'){1}else{0}
}catch{$d['Disable USB Selective Suspend']=0}
try{$bcd=(bcdedit /enum 2>$null) -join ' ';$d['Set TSC Sync Policy (Precise Game Timing)']=if($bcd -match 'tscsyncpolicy\s+Enhanced'){1}else{0}}catch{$d['Set TSC Sync Policy (Precise Game Timing)']=0}
$d['Disable GameInput Service (gaminputsvc)']=csvc 'gaminputsvc'

# Network (Razer Cortex Speed Up style)
try{$tcpg=(netsh int tcp show global 2>$null) -join ' ';$d['Enable TCP Fast Open']=if($tcpg -imatch 'Fast Open.*Enabled'){1}else{0}}catch{$d['Enable TCP Fast Open']=0}
try{
  $imOff=0
  Get-NetAdapter -Physical -EA Stop | ForEach-Object {
    try{
      $im=Get-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*InterruptModeration" -EA Stop
      if($im -and ($im.RegistryValue -eq 0 -or $im.RegistryValue -eq '0')){$imOff=1}
    }catch{}
  }
  $d['Disable NIC Interrupt Moderation']=$imOff
}catch{$d['Disable NIC Interrupt Moderation']=0}

# Services (Windows Service Optimization)
$d['Disable Secondary Logon (seclogon)']=csvc 'seclogon'
$d['Disable WMI Performance Adapter (wmiApSrv)']=csvc 'wmiApSrv'
$d['Disable TCP/IP NetBIOS Helper (lmhosts)']=csvc 'lmhosts'
$d['Disable Telephony Service (TapiSrv)']=csvc 'TapiSrv'
$d['Disable Still Image Service (StiSvc)']=csvc 'StiSvc'
$d['Disable Bluetooth Support Service (bthserv)']=csvc 'bthserv'
$d['Disable Net.TCP Port Sharing (NetTcpPortSharing)']=csvc 'NetTcpPortSharing'
$d['Disable Remote Access Manager (RasMan)']=csvc 'RasMan'

$d | ConvertTo-Json -Compress`;

      // Run PS script — retry once if output is empty/missing
      const runDetect = () => runPowerShell(psScript, 45000).catch(() => "{}");
      let raw = await runDetect();
      if (raw.length < 10) {
        console.log("[detect] First attempt returned empty — retrying...");
        await new Promise(r => setTimeout(r, 800));
        raw = await runDetect();
      }
      console.log("[detect] Raw output length:", raw.length);

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // PS failed entirely — return last cached result so UI keeps showing correct state
        if (_detectCache) {
          console.log("[detect] Using cached detection result from", new Date(_detectCache.ts).toISOString());
          const cached = _detectCache.results;
          const active = Object.values(cached).filter(v => v === 1).length;
          const total = Object.keys(cached).length;
          return res.json({ active, total, results: cached, fromCache: true });
        }
        console.error("[detect] No JSON found and no cache available. Raw:", raw.slice(0, 300));
        return res.json({ active: 0, total: 0, results: {} });
      }

      let results: Record<string, number> = {};
      try {
        results = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error("[detect] JSON parse failed:", parseErr, "Raw:", jsonMatch[0].slice(0, 300));
        return res.json({ active: 0, total: 0, results: {} });
      }

      console.log("[detect] Detected", Object.keys(results).length, "tweaks from system");

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

      // Save to cache so future failures return last known good state
      _detectCache = { results, ts: Date.now() };
      console.log("[detect] Active tweaks:", activeCount, "of", Object.keys(results).length);
      res.json({ active: activeCount, total: Object.keys(results).length, results });
    } catch (err) {
      // On any unexpected error, return cached result if available
      if (_detectCache) {
        const cached = _detectCache.results;
        const active = Object.values(cached).filter(v => v === 1).length;
        return res.json({ active, total: Object.keys(cached).length, results: cached, fromCache: true });
      }
      console.error("[detect] Detection endpoint error:", err);
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
            // Native Node.js: read $Recycle.Bin on all drives directly
            const drives = ["C:", "D:", "E:", "F:", "G:"];
            for (const drv of drives) {
              const binPath = `${drv}\\$Recycle.Bin`;
              try {
                const sub = await getDirSize(binPath);
                totalSize += sub.size;
                totalCount += sub.count;
              } catch {}
            }
          } else if (cat.globDir && cat.globPattern) {
            try {
              await fs.promises.access(cat.globDir);
              const entries = await fs.promises.readdir(cat.globDir);
              const pattern = new RegExp("^" + cat.globPattern.replace(/\*/g, ".*") + "$", "i");
              for (const entry of entries) {
                if (pattern.test(entry)) {
                  try {
                    const stat = await fs.promises.stat(path.join(cat.globDir, entry));
                    if (stat.isFile()) {
                      totalSize += stat.size;
                      totalCount++;
                    }
                  } catch {}
                }
              }
            } catch {}
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
          // Stop both Windows Update and BITS (Background Intelligent Transfer) so no file is locked
          await runCmd("net stop wuauserv 2>nul & net stop bits 2>nul & net stop cryptSvc 2>nul & net stop msiserver 2>nul", 12000).catch(() => {});
        }

        if (isRecycle) {
          // Native: enumerate $Recycle.Bin on all drives for size, then use rd to empty
          try {
            const drives = ["C:", "D:", "E:", "F:", "G:"];
            for (const drv of drives) {
              const binPath = `${drv}\\$Recycle.Bin`;
              try {
                const { size } = await getDirSize(binPath);
                freed += size;
              } catch {}
            }
          } catch {}
          // Use cmd rd to wipe recycle bin natively (no PS, no COM)
          await runCmd("for %d in (C D E F G) do @if exist %d:\\$Recycle.Bin rd /s /q %d:\\$Recycle.Bin 2>nul", 12000).catch(() => {});
          // Also use the shell API via PowerShell as a fallback/supplement
          await runPowerShell(`Clear-RecycleBin -Force -ErrorAction SilentlyContinue`, 8000).catch(() => {});
        } else if (cat.globDir && cat.globPattern) {
          try {
            await fs.promises.access(cat.globDir);
            const entries = await fs.promises.readdir(cat.globDir);
            const pattern = new RegExp("^" + cat.globPattern.replace(/\*/g, ".*") + "$", "i");
            for (const entry of entries) {
              if (pattern.test(entry)) {
                const full = path.join(cat.globDir, entry);
                try {
                  const stat = await fs.promises.stat(full);
                  if (stat.isFile()) {
                    freed += stat.size;
                    await fs.promises.rm(full, { force: true });
                  }
                } catch {}
              }
            }
          } catch {}
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
          await runCmd("net start cryptSvc 2>nul & net start bits 2>nul & net start wuauserv 2>nul & net start msiserver 2>nul", 12000).catch(() => {});
        }

        totalFreed += freed;
        if (freed > 0) cleaned.push(cat.name);
      }

      if (totalFreed > 0) {
        await storage.addCleaningHistory({
          date: new Date().toISOString(),
          freed: totalFreed,
          freedHuman: fmtSize(totalFreed),
          count: cleaned.length,
        });
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
        const adapterFilter = `Get-NetAdapter | Where-Object {$_.Status -eq 'Up' -and $_.InterfaceDescription -notmatch 'Virtual|VMware|VirtualBox|Hyper-V|TAP-|VPN|Tunnel'}`;
        if (provider === "default") {
          psScript = `
$adapters = ${adapterFilter}
foreach ($a in $adapters) {
  Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses
}
Write-Host "DNS reset to automatic (DHCP) on $($adapters.Count) physical adapter(s)."`;
        } else {
          psScript = `
$adapters = ${adapterFilter}
foreach ($a in $adapters) {
  Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ('${dnsInfo.primary}','${dnsInfo.secondary}')
}
Write-Host "DNS set to ${provider} (${dnsInfo.primary} / ${dnsInfo.secondary}) on $($adapters.Count) physical adapter(s)."`;
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
            "defrag","nvidia-cp","nvidia-app","windows-update",
          ]),
        })
        .parse(req.body);

      const commands: Record<string, { name: string; command: string; description: string }> = {
        sfc: { name: "System File Checker", command: `powershell -NoProfile -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k','sfc /scannow & echo. & echo ===== SFC Complete ===== & pause'"`, description: "Scans and repairs corrupted Windows system files. Opens an elevated window." },
        dism: { name: "DISM Health Restore", command: `powershell -NoProfile -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k','DISM /Online /Cleanup-Image /RestoreHealth & echo. & echo ===== DISM Complete ===== & pause'"`, description: "Repairs the Windows image. Requires internet. Can take 10-30 minutes." },
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
        "windows-update-default": { name: "Windows Update Default", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 4 /f && reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 0 /f && reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" /v DisableWindowsUpdateAccess /t REG_DWORD /d 0 /f', description: "Restores default Windows Update behavior (auto download and scheduled install)." },
        "windows-update-security": { name: "Windows Update Security Only", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 3 /f && reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 0 /f', description: "Restricts Windows Update to notify-before-install mode (security updates applied manually)." },
        "location-on": { name: "Enable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 0 /f & reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableWindowsLocationProvider" /t REG_DWORD /d 0 /f & reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocationScripting" /t REG_DWORD /d 0 /f & reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lfsvc" /v "Start" /t REG_DWORD /d 2 /f & sc config lfsvc start= auto & net start lfsvc 2>nul & reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v "Value" /t REG_SZ /d "Allow" /f & reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v "Value" /t REG_SZ /d "Allow" /f & echo Location Services fully re-enabled.', description: "Fully re-enables Windows Location Services via Group Policy (sets all three DisableLocation keys to 0), enables the lfsvc service, and allows location access for apps." },
        "location-off": { name: "Disable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 1 /f & reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableWindowsLocationProvider" /t REG_DWORD /d 1 /f & reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocationScripting" /t REG_DWORD /d 1 /f & sc config lfsvc start= disabled & net stop lfsvc 2>nul & echo Location Services disabled.', description: "Completely disables Windows Location Services via Group Policy (sets all three DisableLocation keys to 1) and stops the lfsvc service." },
        "open-system-restore": { name: "Open System Restore", command: "rstrui.exe", description: "Opens the Windows System Restore wizard." },
        defrag: { name: "Optimize & Defrag Drives", command: "dfrgui", description: "Opens the Windows Optimize Drives tool to defragment or optimize drives." },
        "nvidia-cp": { name: "NVIDIA Control Panel", command: `powershell -NoProfile -Command "$p=@('${String.raw`C:\Program Files\NVIDIA Corporation\Control Panel Client\nvcplui.exe`}','${String.raw`C:\Windows\System32\nvcplui.exe`}','${String.raw`C:\Program Files (x86)\NVIDIA Corporation\Control Panel Client\nvcplui.exe`}');$f=$p|Where-Object{Test-Path $_}|Select-Object -First 1;if($f){Start-Process $f}else{Start-Process 'ms-settings:display'}"`, description: "Opens the NVIDIA Control Panel. Falls back to Display Settings if not found." },
        "nvidia-app": { name: "NVIDIA App", command: `powershell -NoProfile -Command "$p=@('${String.raw`C:\Program Files\NVIDIA Corporation\NVIDIA app\nvidia-app.exe`}','${String.raw`C:\Program Files\NVIDIA Corporation\NVIDIA App\nvidia-app.exe`}','${String.raw`C:\Program Files\NVIDIA Corporation\NvContainer\nvidia-app.exe`}');$f=$p|Where-Object{Test-Path $_}|Select-Object -First 1;if($f){Start-Process $f}else{Start-Process 'https://www.nvidia.com/en-us/software/nvidia-app/'}"`, description: "Opens the NVIDIA App. Falls back to NVIDIA website if not installed." },
        "windows-update": { name: "Windows Update", command: "start ms-settings:windowsupdate", description: "Opens Windows Update settings." },
      };

      const info = commands[action];

      if (process.platform !== "win32") {
        return res.json({ success: true, action, ...info, output: "Windows only." });
      }

      const TERMINAL_ACTIONS = new Set([
        "checkdisk", "network-reset",
      ]);
      const GUI_ACTIONS = new Set([
        "open-system-restore", "disk-cleanup",
        "sfc", "dism",
        "defrag", "nvidia-cp", "nvidia-app", "windows-update",
      ]);

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
    const APP_VERSION = "3.5.0";

    function semverGte(a: string, b: string): boolean {
      const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
      const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
      for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff > 0;
      }
      return true;
    }

    try {
      const response = await fetch(
        "https://api.github.com/repos/JaidenGoode/JGoode-s-AIO-PC-Tool/releases/latest",
        { headers: { "User-Agent": "JGoode-AIO-PC-Tool" } }
      );

      if (response.status === 404) {
        return res.json({
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          isUpToDate: true,
          releaseUrl: "https://github.com/JaidenGoode/JGoode-s-AIO-PC-Tool/releases",
          releaseName: "",
          publishedAt: null,
          note: "No releases published yet",
        });
      }

      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const release = (await response.json()) as {
        tag_name: string;
        name: string;
        html_url: string;
        published_at: string;
      };

      if (!release.tag_name) throw new Error("Invalid release data from GitHub");

      const latestVersion = release.tag_name.replace(/^v/, "");
      res.json({
        currentVersion: APP_VERSION,
        latestVersion,
        isUpToDate: semverGte(APP_VERSION, latestVersion),
        releaseUrl: release.html_url,
        releaseName: release.name || `v${latestVersion}`,
        publishedAt: release.published_at,
      });
    } catch (err: any) {
      res.status(503).json({
        error: err?.message || "Could not reach GitHub. Check your internet connection and try again.",
      });
    }
  });

  // ── GitHub Integration ────────────────────────────────────────────────────
  app.get("/api/github/status", (_req, res) => {
    res.json({ configured: isTokenConfigured() });
  });

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
      let targetRepo = repo || repoName || "JGoode-s-AIO-PC-Tool";

      if (createNew && repoName) {
        const newRepo = await createRepo(
          repoName,
          description || "JGoode A.I.O PC Tool — All-in-one Windows optimization suite with 87 PowerShell tweaks, Windows Service Optimization, live hardware monitoring, and full theme customization.",
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

      const collectDir = (dir: string, base: string): void => {
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
      };

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
