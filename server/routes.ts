import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import si from "systeminformation";
import { getGitHubUser, listUserRepos, createRepo, pushFilesViaTree, isTokenConfigured } from "./github";
import { TWEAKS_SEED } from "@tweaks/seed";
import { TWEAK_DETECT_SCRIPT } from "@tweaks/detect";
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
      // Remove any tweaks that were previously seeded under removed categories
      const removed = await storage.removeTweaksByCategory("privacy");
      if (removed > 0) console.log(`[seed] Removed ${removed} legacy privacy tweaks`);

      // Purge any orphaned tweaks whose title is no longer in the current seed
      const seedTitles = TWEAKS_SEED.map((t) => t.title);
      const orphaned = await storage.removeTweaksNotInSeed(seedTitles);
      if (orphaned > 0) console.log(`[seed] Removed ${orphaned} orphaned tweaks not in current seed`);

      const freshExisting = await storage.getTweaks();
      const existingTitles = new Set(freshExisting.map((t) => t.title));
      const existingByTitle = new Map(freshExisting.map((t) => [t.title, t]));
      let added = 0;
      let metaUpdated = 0;
      for (const tweak of TWEAKS_SEED) {
        if (!existingTitles.has(tweak.title)) {
          await storage.createTweak(tweak);
          added++;
        } else {
          const existing = existingByTitle.get(tweak.title);
          if (existing) {
            const needsUpdate =
              existing.category !== tweak.category ||
              existing.description !== tweak.description ||
              existing.warning !== (tweak.warning ?? null) ||
              existing.featureBreaks !== (tweak.featureBreaks ?? null);
            if (needsUpdate) {
              await storage.updateTweak(existing.id, {
                category: tweak.category,
                description: tweak.description,
                warning: tweak.warning,
                featureBreaks: tweak.featureBreaks,
              });
              metaUpdated++;
            }
          }
        }
      }
      if (added > 0) console.log(`[seed] Added ${added} new tweaks`);
      if (metaUpdated > 0) console.log(`[seed] Updated metadata for ${metaUpdated} tweaks`);
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
      items.slice(0, 5000).map(async (item) => {
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
            // Only count as freed if the entry is actually gone now
            try { await fs.promises.access(full); } catch { freed += itemSize; }
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
  // Scans/cleans a named subdir inside every profile-like child of each parent dir.
  // e.g. Chrome: parent=User Data, subdir="Cache\Cache_Data" → catches Default + Profile N automatically.
  subDirScan?: { parent: string; subdir: string }[];
  // false = do NOT auto-check after scan (user must opt in). Default: true.
  autoSelect?: boolean;
  // Optional caution note shown in the UI row for this category.
  warnNote?: string;
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
        description: "Chrome, Edge, and Opera GX browser cache — all profiles auto-detected",
        warnNote: "Close your browser before cleaning for best results — open browsers may hold cache files in use.",
        // subDirScan detects every Chrome/Edge profile (Default, Profile 1, Profile 2, …) automatically
        subDirScan: [
          { parent: path.join(local, "Google", "Chrome", "User Data"),    subdir: path.join("Cache", "Cache_Data") },
          { parent: path.join(local, "Google", "Chrome", "User Data"),    subdir: "Code Cache" },
          { parent: path.join(local, "Google", "Chrome", "User Data"),    subdir: "GPUCache" },
          { parent: path.join(local, "Microsoft", "Edge", "User Data"),   subdir: path.join("Cache", "Cache_Data") },
          { parent: path.join(local, "Microsoft", "Edge", "User Data"),   subdir: "Code Cache" },
          { parent: path.join(local, "Microsoft", "Edge", "User Data"),   subdir: "GPUCache" },
        ],
        // Opera GX uses a single stable profile — keep as explicit paths
        paths: [
          path.join(roaming, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "Code Cache"),
          path.join(roaming, "Opera Software", "Opera GX Stable", "GPUCache"),
          path.join(local,   "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
          path.join(local,   "Opera Software", "Opera GX Stable", "Code Cache"),
          path.join(local,   "Opera Software", "Opera GX Stable", "GPUCache"),
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
        description: "DirectX 12, NVIDIA, AMD, and Intel GPU shader caches — rebuilt automatically on next game launch",
        autoSelect: false,
        warnNote: "GPU rebuilds these on first game launch after cleaning — may cause brief stutter on first run. Use to fix persistent game crashes or black screens.",
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
        warnNote: "Close Discord fully (right-click tray icon → Quit) before cleaning for best results.",
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
        name: "Delivery Optimization Files",
        description: "Windows P2P update distribution cache used to share updates with other PCs",
        paths: [],
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
        cpu: { model: cpu.brand || cpu.manufacturer || "Unknown CPU", physicalCores: cpu.physicalCores || 0, threads: cpu.cores || 0, speed: cpu.speed },
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
        cpu: { model: "Unknown CPU", physicalCores: 0, threads: 0, speed: 0 },
        gpu: { model: "Unknown GPU", vram: "Unknown" },
        memory: { total: "0 GB", used: "0 GB", type: "Unknown" },
        system: { os: "Unknown", version: "Unknown" },
        storage: { primaryDisk: "Unknown", totalSpace: "0 GB", freeSpace: "0 GB" },
      });
    }
  });

  // ── Live System Usage (CPU %, RAM %, GPU %) ────────────────────────────────
  // LHM WMI query for GPU load — fast (<100ms when LHM running, fails instantly when not)
  const LHM_GPU_USAGE_SCRIPT = `
try {
  $s = Get-WmiObject -Namespace "root/LibreHardwareMonitor" -Class Sensor -EA Stop |
    Where-Object { $_.SensorType -eq "Load" -and $_.Name -eq "GPU Core" }
  if ($s) { [math]::Round(($s | Measure-Object -Property Value -Maximum).Maximum, 0) }
} catch {}`;

  // Cache for graphics() which is slow on Windows — only refetch every 60s
  let graphicsCache: { data: si.Systeminformation.GraphicsData; expiresAt: number } | null = null;
  // Concurrency lock — only one LHM GPU PowerShell query at a time for usage
  let usageLhmInFlight: Promise<string> | null = null;

  app.get("/api/system/usage", async (_req, res) => {
    try {
      let lhmPromise: Promise<string>;
      if (process.platform === "win32") {
        if (!usageLhmInFlight) {
          usageLhmInFlight = runPowerShell(LHM_GPU_USAGE_SCRIPT, 2000)
            .catch(() => "")
            .finally(() => { usageLhmInFlight = null; });
        }
        lhmPromise = usageLhmInFlight;
      } else {
        lhmPromise = Promise.resolve("");
      }

      // Fetch graphics only every 60s — GPU model/VRAM don't change, and si.graphics() is slow on Windows
      const graphicsPromise =
        graphicsCache && Date.now() < graphicsCache.expiresAt
          ? Promise.resolve(graphicsCache.data)
          : si.graphics().then((g) => {
              graphicsCache = { data: g, expiresAt: Date.now() + 60000 };
              return g;
            }).catch(() => graphicsCache?.data ?? { controllers: [] } as si.Systeminformation.GraphicsData);

      const [load, mem, graphics, fsSize, diskIO, lhmRaw] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        graphicsPromise,
        si.fsSize(),
        si.fsStats().catch(() => null as si.Systeminformation.FsStatsData | null),
        lhmPromise,
      ]);

      const controllers = graphics.controllers || [];
      const gpuCtrl =
        controllers.find((c) =>
          /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
        ) || controllers[0];

      const rootFs =
        fsSize.find((f) => f.mount === "C:" || f.mount === "/") || fsSize[0];
      const diskUsePct = rootFs ? Math.round(rootFs.use || 0) : 0;

      const lhmGpuUsage = lhmRaw ? parseInt(lhmRaw.trim(), 10) : NaN;
      const gpuUsage = !isNaN(lhmGpuUsage) && lhmGpuUsage >= 0 && lhmGpuUsage <= 100
        ? lhmGpuUsage
        : ((gpuCtrl as any)?.utilizationGpu ?? null);

      const gpuTemp = (gpuCtrl as any)?.temperatureGpu;

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
          usage: gpuUsage,
          model: gpuCtrl?.model || null,
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
  // Cache + concurrency lock: the PowerShell WMI query can take up to 8s.
  // Without this, back-to-back requests spawn multiple PS processes simultaneously
  // which stalls the Windows WMI stack and freezes audio/system.
  type TempResult = { cpu: { current: number | null; max: number | null }; gpu: { current: number | null; hotspot: number | null } };
  let tempCache: { data: TempResult; expiresAt: number } | null = null;
  let tempInFlight: Promise<TempResult> | null = null;

  async function fetchTempData(): Promise<TempResult> {
      const isValidCpuTemp = (t: unknown): t is number =>
        typeof t === "number" && isFinite(t) && t >= 20 && t < 115;
      const isValidGpuTemp = (t: unknown): t is number =>
        typeof t === "number" && isFinite(t) && t >= 20 && t < 120;

      let cpuCurrent: number | null = null;
      let cpuMax: number | null = null;
      let gpuCurrent: number | null = null;
      let gpuHotspot: number | null = null;

      if (process.platform === "win32") {
        const psScript = `
$cpuTemp = $null
$cpuPeak = $null
$gpuTemp = $null
$gpuHotspot = $null

function Get-CpuTempFromSensors($sensors, $ns) {
  $result = @{ temp = $null; peak = $null }
  if (-not $sensors -or $sensors.Count -eq 0) { return $result }

  # Strategy A: match sensors whose Parent is a CPU hardware identifier
  $cpuHwIds = @()
  try {
    $hw = @(Get-CimInstance -Namespace $ns -ClassName "Hardware" -EA Stop |
      Where-Object { $_.HardwareType -eq "Cpu" })
    if ($hw.Count -eq 0) {
      $hw = @(Get-WmiObject -Namespace $ns -Class Hardware -EA Stop |
        Where-Object { $_.HardwareType -eq "Cpu" })
    }
    $cpuHwIds = @($hw | ForEach-Object { $_.Identifier })
  } catch {}

  if ($cpuHwIds.Count -gt 0) {
    $s = @($sensors | Where-Object { $cpuHwIds -contains $_.Parent })
    if ($s.Count -gt 0) {
      $vals = @($s | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
      if ($vals.Count -gt 0) { $result.temp = ($vals | Measure-Object -Maximum).Maximum }
      $mx = @($s | ForEach-Object { [math]::Round([double]$_.Max, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
      if ($mx.Count -gt 0) { $result.peak = ($mx | Measure-Object -Maximum).Maximum }
      if ($result.temp) { return $result }
    }
  }

  # Strategy B: identifier contains cpu/amd/intel/arm
  $s = @($sensors | Where-Object { $_.Identifier -match "cpu|amd|intel|arm" -and $_.Identifier -notmatch "gpu" })
  if ($s.Count -gt 0) {
    $vals = @($s | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
    if ($vals.Count -gt 0) { $result.temp = ($vals | Measure-Object -Maximum).Maximum }
    $mx = @($s | ForEach-Object { [math]::Round([double]$_.Max, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
    if ($mx.Count -gt 0) { $result.peak = ($mx | Measure-Object -Maximum).Maximum }
    if ($result.temp) { return $result }
  }

  # Strategy C: sensor name keywords — Tdie, Tctl, CCD, Package, CPU Core, etc.
  $s = @($sensors | Where-Object {
    $_.Name -match "CPU|Core \(T|Tdie|Tctl|CCD|Package|Socket|Die" -and $_.Identifier -notmatch "gpu"
  })
  if ($s.Count -gt 0) {
    $vals = @($s | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
    if ($vals.Count -gt 0) { $result.temp = ($vals | Measure-Object -Maximum).Maximum }
    $mx = @($s | ForEach-Object { [math]::Round([double]$_.Max, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 115 })
    if ($mx.Count -gt 0) { $result.peak = ($mx | Measure-Object -Maximum).Maximum }
    if ($result.temp) { return $result }
  }

  # Strategy D: any non-GPU/storage temperature sensor — catches SuperIO motherboard chips
  $s = @($sensors | Where-Object { $_.Identifier -notmatch "gpu|hdd|ssd|nvme|storage" })
  if ($s.Count -gt 0) {
    $vals = @($s | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($vals.Count -gt 0) { $result.temp = ($vals | Measure-Object -Maximum).Maximum }
    $mx = @($s | ForEach-Object { [math]::Round([double]$_.Max, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($mx.Count -gt 0) { $result.peak = ($mx | Measure-Object -Maximum).Maximum }
  }

  return $result
}

function Get-LhmSensors($ns) {
  $s = @()
  try { $s = @(Get-CimInstance -Namespace $ns -ClassName "Sensor" -EA Stop | Where-Object { $_.SensorType -eq "Temperature" }) } catch {}
  if ($s.Count -eq 0) {
    try { $s = @(Get-WmiObject -Namespace $ns -Class Sensor -EA Stop | Where-Object { $_.SensorType -eq "Temperature" }) } catch {}
  }
  return $s
}

# ── Method 1: LibreHardwareMonitor (CimInstance + WmiObject fallback) ─────────
$lhmSensors = Get-LhmSensors "root/LibreHardwareMonitor"
if ($lhmSensors.Count -gt 0) {
  $cpuResult = Get-CpuTempFromSensors $lhmSensors "root/LibreHardwareMonitor"
  $cpuTemp = $cpuResult.temp
  $cpuPeak = $cpuResult.peak

  $gpuSensors = @($lhmSensors | Where-Object { $_.Name -eq "GPU Core" })
  if ($gpuSensors.Count -eq 0) { $gpuSensors = @($lhmSensors | Where-Object { $_.Identifier -match "gpu" }) }
  if ($gpuSensors.Count -gt 0) {
    $vals = @($gpuSensors | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 120 })
    if ($vals.Count -gt 0) { $gpuTemp = ($vals | Measure-Object -Maximum).Maximum }
  }
  $gpuHotSensors = @($lhmSensors | Where-Object { $_.Name -eq "GPU Hot Spot" })
  if ($gpuHotSensors.Count -gt 0) {
    $vals = @($gpuHotSensors | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 130 })
    if ($vals.Count -gt 0) { $gpuHotspot = ($vals | Measure-Object -Maximum).Maximum }
  }
}

# ── Method 2: OpenHardwareMonitor ─────────────────────────────────────────────
if (-not $cpuTemp) {
  $ohmSensors = Get-LhmSensors "root/OpenHardwareMonitor"
  if ($ohmSensors.Count -gt 0) {
    $cpuResult = Get-CpuTempFromSensors $ohmSensors "root/OpenHardwareMonitor"
    $cpuTemp = $cpuResult.temp
    $cpuPeak = $cpuResult.peak
    if (-not $gpuTemp) {
      $gpuSensors = @($ohmSensors | Where-Object { $_.Name -eq "GPU Core" })
      if ($gpuSensors.Count -eq 0) { $gpuSensors = @($ohmSensors | Where-Object { $_.Identifier -match "gpu" }) }
      if ($gpuSensors.Count -gt 0) {
        $vals = @($gpuSensors | ForEach-Object { [math]::Round([double]$_.Value, 0) } | Where-Object { $_ -ge 20 -and $_ -lt 120 })
        if ($vals.Count -gt 0) { $gpuTemp = ($vals | Measure-Object -Maximum).Maximum }
      }
    }
  }
}

# ── Method 3: Windows Thermal Zone Performance Counter ────────────────────────
if (-not $cpuTemp) {
  try {
    $tzData = @(Get-CimInstance -ClassName "Win32_PerfFormattedData_Counters_ThermalZoneInformation" -EA Stop |
      Where-Object { $_.HighPrecisionTemperature -gt 0 })
    $vals = @($tzData | ForEach-Object { [math]::Round($_.HighPrecisionTemperature / 10.0 - 273.15, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($vals.Count -gt 0) { $cpuTemp = ($vals | Sort-Object -Descending)[0] }
  } catch {}
}

# ── Method 4: MSAcpi thermal zones ────────────────────────────────────────────
if (-not $cpuTemp) {
  try {
    $zones = @(Get-CimInstance -Namespace "root/wmi" -ClassName "MSAcpi_ThermalZoneTemperature" -EA Stop)
    if ($zones.Count -eq 0) { $zones = @(Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -EA Stop) }
    $vals = @($zones | ForEach-Object { [math]::Round($_.CurrentTemperature / 10.0 - 273.15, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($vals.Count -gt 0) { $cpuTemp = ($vals | Sort-Object -Descending)[0] }
  } catch {}
}

$out = [ordered]@{}
if ($null -ne $cpuTemp) { $out['cpu'] = $cpuTemp }
if ($null -ne $cpuPeak) { $out['cpuPeak'] = $cpuPeak }
if ($null -ne $gpuTemp) { $out['gpu'] = $gpuTemp }
if ($null -ne $gpuHotspot) { $out['gpuHotspot'] = $gpuHotspot }
$out | ConvertTo-Json -Compress -Depth 1`;

        const output = await runPowerShell(psScript, 8000).catch(() => "");
        try {
          const m = output.trim().match(/\{[\s\S]*\}/);
          if (m) {
            const j = JSON.parse(m[0]);
            if (isValidCpuTemp(j.cpu)) cpuCurrent = Math.round(j.cpu);
            if (isValidCpuTemp(j.cpuPeak)) cpuMax = Math.round(j.cpuPeak);
            if (isValidGpuTemp(j.gpu)) gpuCurrent = Math.round(j.gpu);
            if (isValidGpuTemp(j.gpuHotspot)) gpuHotspot = Math.round(j.gpuHotspot);
          }
        } catch {}
      }

      // Fallback for CPU if PowerShell returned nothing (Linux/Mac or sensor not found)
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

      // Fallback for GPU temp if LHM didn't return it — try si.graphics()
      if (gpuCurrent === null) {
        try {
          const graphics = await si.graphics();
          const controllers = graphics.controllers || [];
          const gpuCtrl = controllers.find((c) =>
            /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
          ) || controllers[0];
          const rawGpuTemp = (gpuCtrl as any)?.temperatureGpu ?? null;
          if (isValidGpuTemp(rawGpuTemp)) gpuCurrent = Math.round(rawGpuTemp);
        } catch {}
      }

      return { cpu: { current: cpuCurrent, max: cpuMax }, gpu: { current: gpuCurrent, hotspot: gpuHotspot } };
  }

  app.get("/api/system/temps", async (_req, res) => {
    try {
      // Serve cache if it hasn't expired yet
      if (tempCache && Date.now() < tempCache.expiresAt) {
        return res.json(tempCache.data);
      }
      // If a fetch is already running, piggyback on it — don't spawn a second PS process
      if (!tempInFlight) {
        tempInFlight = fetchTempData().finally(() => { tempInFlight = null; });
      }
      const data = await tempInFlight;
      // Cache for 25 seconds (client polls every 30s after this fix)
      tempCache = { data, expiresAt: Date.now() + 25000 };
      return res.json(data);
    } catch {
      return res.json({ cpu: { current: null, max: null }, gpu: { current: null } });
    }
  });

  // ── Temps debug — dumps raw LHM sensors to diagnose CPU detection issues ───
  app.get("/api/system/temps/debug", async (_req, res) => {
    if (process.platform !== "win32") return res.json({ error: "Windows only" });
    const script = `
try {
  $hw = @(Get-WmiObject -Namespace "root/LibreHardwareMonitor" -Class Hardware -EA Stop)
  $sensors = @(Get-WmiObject -Namespace "root/LibreHardwareMonitor" -Class Sensor -EA Stop |
    Where-Object { $_.SensorType -eq "Temperature" })
  [ordered]@{
    hardware = $hw | ForEach-Object { [ordered]@{ Name=$_.Name; HardwareType=$_.HardwareType; Identifier=$_.Identifier; Parent=$_.Parent } }
    sensors  = $sensors | ForEach-Object { [ordered]@{ Name=$_.Name; Identifier=$_.Identifier; Parent=$_.Parent; Value=$_.Value; Max=$_.Max } }
  } | ConvertTo-Json -Depth 4 -Compress
} catch { '{"error":"' + $_.Exception.Message + '"}' }`;
    const raw = await runPowerShell(script, 8000).catch(() => "{}");
    const m = raw.trim().match(/\{[\s\S]*\}/);
    try { res.json(m ? JSON.parse(m[0]) : { error: "no output" }); }
    catch { res.json({ error: "parse failed", raw }); }
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
      const psScript = TWEAK_DETECT_SCRIPT;

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
            // Read $I* metadata files inside every $RECYCLE.BIN\{SID} folder across all drives.
            // Each $I* file stores the original file size as Int64 at byte offset 8 — works without
            // needing access to the actual $R* content files, reliable on all Windows versions.
            const psRecycleScan = `
try {
  $tot=0L; $cnt=0
  Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue | ForEach-Object {
    try {
      $rb = Join-Path $_.Root '$RECYCLE.BIN'
      if (Test-Path -LiteralPath $rb -EA SilentlyContinue) {
        Get-ChildItem -LiteralPath $rb -Directory -Force -EA SilentlyContinue | ForEach-Object {
          Get-ChildItem -LiteralPath $_.FullName -Force -EA SilentlyContinue | Where-Object { $_.Name -like '$I*' } | ForEach-Object {
            try {
              $b = [System.IO.File]::ReadAllBytes($_.FullName)
              if ($b.Length -ge 24) {
                $s = [System.BitConverter]::ToInt64($b, 8)
                if ($s -gt 0) { $tot += $s; $cnt++ }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  Write-Output "$tot $cnt"
} catch { Write-Output "0 0" }`.trim();
            const raw = await runPowerShell(psRecycleScan, 12000).catch(() => "0 0");
            const parts = raw.trim().split(/\s+/);
            totalSize += Math.max(0, parseInt(parts[0]) || 0);
            totalCount += Math.max(0, parseInt(parts[1]) || 0);
          } else if (cat.id === "deliveryopt" && process.platform === "win32") {
            // Scan entire DeliveryOptimization folder — subfolder structure varies by Windows version
            const psDoScan = `
try {
  $root = Join-Path $env:SystemRoot 'SoftwareDistribution\\DeliveryOptimization'
  $tot=0L; $cnt=0
  if (Test-Path -LiteralPath $root -EA SilentlyContinue) {
    $items = Get-ChildItem -LiteralPath $root -Recurse -Force -EA SilentlyContinue
    $s = ($items | Measure-Object -Property Length -Sum -EA SilentlyContinue).Sum
    if ($s) { $tot = [long]$s }
    $cnt = ($items | Where-Object { -not $_.PSIsContainer }).Count
  }
  Write-Output "$tot $cnt"
} catch { Write-Output "0 0" }`.trim();
            const raw = await runPowerShell(psDoScan, 12000).catch(() => "0 0");
            const parts = raw.trim().split(/\s+/);
            totalSize += Math.max(0, parseInt(parts[0]) || 0);
            totalCount += Math.max(0, parseInt(parts[1]) || 0);
          } else if (cat.globDir && cat.globPattern) {
            // Glob pattern scan (e.g. thumbcache_*.db)
            try {
              await fs.promises.access(cat.globDir);
              const entries = await fs.promises.readdir(cat.globDir);
              const pattern = new RegExp("^" + cat.globPattern.replace(/\*/g, ".*") + "$", "i");
              for (const entry of entries) {
                if (pattern.test(entry)) {
                  try {
                    const stat = await fs.promises.stat(path.join(cat.globDir, entry));
                    if (stat.isFile()) { totalSize += stat.size; totalCount++; }
                  } catch {}
                }
              }
            } catch {}
          } else {
            // subDirScan: expand each {parent, subdir} into per-profile paths
            if (cat.subDirScan && cat.subDirScan.length > 0) {
              const expanded = await expandSubDirScan(cat.subDirScan);
              for (const p of expanded) {
                try {
                  await fs.promises.access(p);
                  const { size, count } = await getDirSize(p);
                  totalSize += size; totalCount += count;
                } catch {}
              }
            }
            // Regular explicit paths
            for (const p of cat.paths) {
              const expanded = expandPath(p);
              try {
                await fs.promises.access(expanded);
                const { size, count } = await getDirSize(expanded);
                totalSize += size; totalCount += count;
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
            autoSelect: cat.autoSelect !== false,
            warnNote: cat.warnNote ?? null,
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

        const isWin          = process.platform === "win32";
        const isWupdate      = id === "wupdate"      && isWin;
        const isRecycle      = id === "recycle"      && isWin;
        const isPrefetch     = id === "prefetch"     && isWin;
        const isThumbnails   = id === "thumbnails"   && isWin;
        const isDeliveryOpt  = id === "deliveryopt"  && isWin;

        if (isWupdate) {
          // Stop only wuauserv and bits — minimal disruption
          await runCmd("net stop wuauserv 2>nul & net stop bits 2>nul", 12000).catch(() => {});
        }

        if (isPrefetch) {
          // Stop SysMain (SuperFetch) to release locks on prefetch files
          await runCmd("net stop SysMain 2>nul", 8000).catch(() => {});
        }

        if (isRecycle) {
          // Measure size using $I* metadata files (same method as scan), then clear
          const psRecycleClean = `
try {
  $tot=0L; $cnt=0
  Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue | ForEach-Object {
    try {
      $rb = Join-Path $_.Root '$RECYCLE.BIN'
      if (Test-Path -LiteralPath $rb -EA SilentlyContinue) {
        Get-ChildItem -LiteralPath $rb -Directory -Force -EA SilentlyContinue | ForEach-Object {
          Get-ChildItem -LiteralPath $_.FullName -Force -EA SilentlyContinue | Where-Object { $_.Name -like '$I*' } | ForEach-Object {
            try {
              $b = [System.IO.File]::ReadAllBytes($_.FullName)
              if ($b.Length -ge 24) {
                $s = [System.BitConverter]::ToInt64($b, 8)
                if ($s -gt 0) { $tot += $s; $cnt++ }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  Write-Output $tot
} catch { Write-Output 0 }`.trim();
          const sizeRaw = await runPowerShell(psRecycleClean, 10000).catch(() => "0");
          freed += Math.max(0, parseInt(sizeRaw.trim()) || 0);
          await runPowerShell(`Clear-RecycleBin -Force -ErrorAction SilentlyContinue`, 10000).catch(() => {});
        } else if (isDeliveryOpt) {
          // Measure entire DO folder, stop service, delete contents (not the folder itself), restart service
          const psDoClean = `
try {
  $root = Join-Path $env:SystemRoot 'SoftwareDistribution\\DeliveryOptimization'
  $tot=0L
  if (Test-Path -LiteralPath $root -EA SilentlyContinue) {
    $s = (Get-ChildItem -LiteralPath $root -Recurse -Force -EA SilentlyContinue | Measure-Object -Property Length -Sum -EA SilentlyContinue).Sum
    if ($s) { $tot = [long]$s }
  }
  Stop-Service DoSvc -Force -EA SilentlyContinue
  if (Test-Path -LiteralPath $root -EA SilentlyContinue) {
    Get-ChildItem -LiteralPath $root -Force -EA SilentlyContinue | Remove-Item -Recurse -Force -EA SilentlyContinue
  }
  Start-Service DoSvc -EA SilentlyContinue
  Write-Output $tot
} catch { Write-Output 0 }`.trim();
          const result = await runPowerShell(psDoClean, 20000).catch(() => "0");
          freed += Math.max(0, parseInt(result.trim()) || 0);
        } else if (isThumbnails) {
          // thumbcache_*.db files are locked by Explorer.exe — stop Explorer, delete, restart
          const psScript = `
$dir = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
$files = @(Get-ChildItem $dir -Filter 'thumbcache_*.db' -File -ErrorAction SilentlyContinue)
$total = ($files | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
if (-not $total) { $total = 0 }
if ($files.Count -gt 0) {
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    foreach ($f in $files) { Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 300
    Start-Process explorer
}
[string]$total`.trim();
          const result = await runPowerShell(psScript, 12000).catch(() => "0");
          const lines = result.trim().split(/\r?\n/);
          freed += Math.max(0, parseInt(lines[lines.length - 1] || "0") || 0);
        } else if (cat.globDir && cat.globPattern) {
          // Glob-pattern clean (e.g. thumbcache_*.db files)
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
                    const sz = stat.size;
                    await fs.promises.rm(full, { force: true });
                    // Verify gone before counting
                    try { await fs.promises.access(full); } catch { freed += sz; }
                  }
                } catch {}
              }
            }
          } catch {}
        } else {
          // subDirScan paths (browser profiles, etc.)
          if (cat.subDirScan && cat.subDirScan.length > 0) {
            const expandedPaths = await expandSubDirScan(cat.subDirScan);
            for (const p of expandedPaths) {
              try {
                await fs.promises.access(p);
                freed += await deleteContents(p);
              } catch {}
            }
          }
          // Explicit paths
          for (const p of cat.paths) {
            const expanded = expandPath(p);
            try {
              await fs.promises.access(expanded);
              freed += await deleteContents(expanded);
            } catch {}
          }
        }

        if (isWupdate) {
          // Restart in same order as stop: wuauserv first, then bits
          await runCmd("net start wuauserv 2>nul & net start bits 2>nul", 12000).catch(() => {});
        }

        if (isPrefetch) {
          // Restart SysMain (SuperFetch) after prefetch clean
          await runCmd("net start SysMain 2>nul", 5000).catch(() => {});
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
            "empty-standby-memory","clear-shader-cache","rebuild-icon-cache","dxdiag",
            "amd-software","power-balanced","power-high","power-ultimate","power-options",
            "hwinfo","gpuz","cpuz","msconfig","eventvwr","services","devmgmt","resmon",
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
        "empty-standby-memory": { name: "Empty Standby Memory", command: `$ErrorActionPreference = 'SilentlyContinue'
if (-not ([System.Management.Automation.PSTypeName]'MemClear').Type) {
  try {
    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Diagnostics; public class MemClear { [StructLayout(LayoutKind.Sequential)] public struct LUID { public uint Lo; public int Hi; } [StructLayout(LayoutKind.Sequential)] public struct TP { public uint Count; public LUID Luid; public uint Attrs; } [DllImport("ntdll.dll")] public static extern int NtSetSystemInformation(int c, IntPtr p, int l); [DllImport("advapi32.dll", SetLastError=true)] public static extern bool OpenProcessToken(IntPtr h, uint a, out IntPtr t); [DllImport("advapi32.dll", SetLastError=true)] public static extern bool LookupPrivilegeValue(string s, string n, ref LUID l); [DllImport("advapi32.dll", SetLastError=true)] public static extern bool AdjustTokenPrivileges(IntPtr t, bool d, ref TP n, uint z, IntPtr p1, IntPtr r); public static void EP(string n) { IntPtr t; LUID l=new LUID(); OpenProcessToken(Process.GetCurrentProcess().Handle, 40, out t); LookupPrivilegeValue(null, n, ref l); TP tp=new TP{Count=1,Luid=l,Attrs=2}; AdjustTokenPrivileges(t, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero); } public static int F(int cmd) { IntPtr p=Marshal.AllocHGlobal(4); Marshal.WriteInt32(p,0,cmd); int r=NtSetSystemInformation(80,p,4); Marshal.FreeHGlobal(p); return r; } }' -Language CSharp
  } catch {}
}
try {
  [MemClear]::EP("SeProfileSingleProcessPrivilege")
  [MemClear]::EP("SeIncreaseQuotaPrivilege")
  $r1 = [MemClear]::F(2)
  $r2 = [MemClear]::F(3)
  $r3 = [MemClear]::F(4)
  $ok = 0
  if ($r1 -eq 0) { $ok++ }
  if ($r2 -eq 0) { $ok++ }
  if ($r3 -eq 0) { $ok++ }
  if ($ok -eq 3) { Write-Output "RAM cleared — working sets flushed, modified pages written, standby purged." }
  elseif ($ok -gt 0) { Write-Output "Partial clear: $ok of 3 operations succeeded." }
  else { Write-Output "Requires Administrator privileges." }
} catch { Write-Output "Error: ensure the app is running as Administrator." }`, description: "RAM fully cleared — working sets flushed, modified pages written to disk, standby list purged." },
        defrag: { name: "Optimize & Defrag Drives", command: "dfrgui", description: "Opens the Windows Optimize Drives tool to defragment or optimize drives." },
        "nvidia-cp": { name: "NVIDIA Control Panel", command: String.raw`powershell -NoProfile -WindowStyle Hidden -Command "$sa=Get-StartApps -EA SilentlyContinue|Where-Object{$_.Name -like '*NVIDIA Control Panel*'}|Select-Object -First 1;if($sa){Start-Process ('shell:AppsFolder\'+$sa.AppID);exit};$pkg=Get-AppxPackage -EA SilentlyContinue|Where-Object{$_.Name -like '*NVIDIAControlPanel*' -or $_.Name -like '*NVIDIA*Control*'}|Select-Object -First 1;if($pkg){$aid=((Get-AppxPackageManifest $pkg -EA SilentlyContinue).Package.Applications.Application|Select-Object -First 1).Id;Start-Process ('shell:AppsFolder\'+$pkg.PackageFamilyName+'!'+$aid);exit};$regs=@('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*');foreach($r in $regs){$e=Get-ItemProperty $r -EA SilentlyContinue|Where-Object{$_.DisplayName -match 'NVIDIA Control Panel'}|Select-Object -First 1;if($e){if($e.DisplayIcon){$i=($e.DisplayIcon -split ',')[0].Trim([char]34);if($i -and (Test-Path $i)){Start-Process $i;exit}};if($e.InstallLocation){$f=Get-ChildItem $e.InstallLocation -Filter 'nvcplui.exe' -Recurse -Depth 3 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($f){Start-Process $f;exit}}}};$drives=Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue|Select-Object -Exp Root;foreach($d in $drives){$pp=@($d+'Program Files\NVIDIA Corporation\Control Panel Client\nvcplui.exe',$d+'Windows\System32\nvcplui.exe',$d+'Windows\SysWOW64\nvcplui.exe');$f=$pp|Where-Object{Test-Path $_}|Select-Object -First 1;if($f){Start-Process $f;exit};$f=Get-ChildItem @($d+'Program Files',$d+'Windows\System32',$d+'Windows\SysWOW64') -Filter 'nvcplui.exe' -Recurse -Depth 4 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($f){Start-Process $f;exit}};Start-Process 'https://www.nvidia.com/en-us/drivers/nvidia-control-panel/'"`, description: "Opens the NVIDIA Control Panel. Detects Start Menu, Store/AppX, Win32 registry, and all drives. Falls back to download page." },
        "nvidia-app": { name: "NVIDIA App", command: String.raw`powershell -NoProfile -WindowStyle Hidden -Command "$sa=Get-StartApps -EA SilentlyContinue|Where-Object{$_.Name -like '*NVIDIA App*'}|Select-Object -First 1;if($sa){Start-Process ('shell:AppsFolder\'+$sa.AppID);exit};$proc=Get-Process -Name 'nvidia-app' -EA SilentlyContinue|Select-Object -First 1;if($proc -and $proc.Path){Start-Process $proc.Path;exit};$pkg=Get-AppxPackage -EA SilentlyContinue|Where-Object{$_.Name -like '*NVIDIA*App*'}|Select-Object -First 1;if($pkg){$aid=((Get-AppxPackageManifest $pkg -EA SilentlyContinue).Package.Applications.Application|Select-Object -First 1).Id;Start-Process ('shell:AppsFolder\'+$pkg.PackageFamilyName+'!'+$aid);exit};$regs=@('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*');foreach($r in $regs){$e=Get-ItemProperty $r -EA SilentlyContinue|Where-Object{$_.DisplayName -match 'NVIDIA App'}|Select-Object -First 1;if($e){if($e.DisplayIcon){$i=($e.DisplayIcon -split ',')[0].Trim([char]34);if($i -and (Test-Path $i)){Start-Process $i;exit}};if($e.InstallLocation){$f=Get-ChildItem $e.InstallLocation -Filter 'nvidia-app.exe' -Recurse -Depth 3 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($f){Start-Process $f;exit}}}};$drives=Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue|Select-Object -Exp Root;foreach($d in $drives){$f=Get-ChildItem @($d+'Program Files',$d+'Program Files (x86)') -Filter 'nvidia-app.exe' -Recurse -Depth 4 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($f){Start-Process $f;exit}};Start-Process 'https://www.nvidia.com/en-us/software/nvidia-app/'"`, description: "Opens the NVIDIA App. Detects Start Menu, running process, Store/AppX, Win32 registry, and all drives. Falls back to website." },
        "windows-update": { name: "Windows Update", command: "start ms-settings:windowsupdate", description: "Opens Windows Update settings." },
        "clear-shader-cache": { name: "Clear Shader Cache", command: `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand JABsAGEAPQAkAGUAbgB2ADoATABPAEMAQQBMAEEAUABQAEQAQQBUAEEAOwAkAHIAYQA9ACQAZQBuAHYAOgBBAFAAUABEAEEAVABBADsAJABwAGEAdABoAHMAPQBAACgAIgAkAGwAYQBcAE4AVgBJAEQASQBBAFwARABYAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAE4AVgBJAEQASQBBAFwARwBMAEMAYQBjAGgAZQAiACwAIgAkAHIAYQBcAE4AVgBJAEQASQBBAFwAQwBvAG0AcAB1AHQAZQBDAGEAYwBoAGUAIgAsACIAJABsAGEAXABBAE0ARABcAEQAeABDAGEAYwBoAGUAIgAsACIAJABsAGEAXABEADMARABTAEMAYQBjAGgAZQAiACkAOwAkAGMAPQAwADsAZgBvAHIAZQBhAGMAaAAoACQAcAAgAGkAbgAgACQAcABhAHQAaABzACkAewBpAGYAKABUAGUAcwB0AC0AUABhAHQAaAAgACQAcAApAHsARwBlAHQALQBDAGgAaQBsAGQASQB0AGUAbQAgACQAcAAgAC0AUgBlAGMAdQByAHMAZQAgAC0ARQBBACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQB8AFIAZQBtAG8AdgBlAC0ASQB0AGUAbQAgAC0ARgBvAHIAYwBlACAALQBSAGUAYwB1AHIAcwBlACAALQBFAEEAIABTAGkAbABlAG4AdABsAHkAQwBvAG4AdABpAG4AdQBlADsAJABjACsAKwB9AH0AOwBXAHIAaQB0AGUALQBPAHUAdABwAHUAdAAgACgAIgBDAGwAZQBhAHIAZQBkACAAIgArACQAYwArACIAIABvAGYAIAA1ACAAcwBoAGEAZABlAHIAIABjAGEAYwBoAGUAIABsAG8AYwBhAHQAaQBvAG4AcwAuACAARwBQAFUAIAByAGUAYgB1AGkAbABkAHMAIABvAG4AIABuAGUAeAB0ACAAZwBhAG0AZQAgAGwAYQB1AG4AYwBoAC4AIgApAA==`, description: "Cleared NVIDIA, AMD, and DirectX shader caches. Your GPU will rebuild them on next game launch." },
        "rebuild-icon-cache": { name: "Rebuild Icon Cache", command: `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand UwB0AG8AcAAtAFAAcgBvAGMAZQBzAHMAIAAtAE4AYQBtAGUAIABlAHgAcABsAG8AcgBlAHIAIAAtAEYAbwByAGMAZQAgAC0ARQBBACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQA7AFMAdABhAHIAdAAtAFMAbABlAGUAcAAgAC0ATQBpAGwAbABpAHMAZQBjAG8AbgBkAHMAIAA2ADAAMAA7AFIAZQBtAG8AdgBlAC0ASQB0AGUAbQAgACIAJABlAG4AdgA6AEwATwBDAEEATABBAFAAUABEAEEAVABBAFwASQBjAG8AbgBDAGEAYwBoAGUALgBkAGIAIgAgAC0ARgBvAHIAYwBlACAALQBFAEEAIABTAGkAbABlAG4AdABsAHkAQwBvAG4AdABpAG4AdQBlADsAUgBlAG0AbwB2AGUALQBJAHQAZQBtACAAIgAkAGUAbgB2ADoATABPAEMAQQBMAEEAUABQAEQAQQBUAEEAXABNAGkAYwByAG8AcwBvAGYAdABcAFcAaQBuAGQAbwB3AHMAXABFAHgAcABsAG8AcgBlAHIAXABpAGMAbwBuAGMAYQBjAGgAZQAqAC4AZABiACIAIAAtAEYAbwByAGMAZQAgAC0ARQBBACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQA7AFMAdABhAHIAdAAtAFAAcgBvAGMAZQBzAHMAIABlAHgAcABsAG8AcgBlAHIAOwBXAHIAaQB0AGUALQBPAHUAdABwAHUAdAAgACIASQBjAG8AbgAgAGMAYQBjAGgAZQAgAHIAZQBiAHUAaQBsAHQALgAgAEkAYwBvAG4AcwAgAHcAaQBsAGwAIAByAGUAZgByAGUAcwBoACAAbQBvAG0AZQBuAHQAYQByAGkAbAB5AC4AIgA=`, description: "Rebuilt the Windows icon cache. Desktop and Explorer icons will refresh." },
        "dxdiag": { name: "DirectX Diagnostic", command: "dxdiag", description: "Opened DirectX Diagnostic Tool." },
        "amd-software": { name: "AMD Software: Adrenalin Edition", command: String.raw`powershell -NoProfile -WindowStyle Hidden -Command "$f=(Get-ItemProperty 'HKCU:\Software\AMD\CN' -Name InstallDir -EA SilentlyContinue).InstallDir;if(-not $f){$f=(Get-ItemProperty 'HKLM:\SOFTWARE\AMD\CN' -Name InstallDir -EA SilentlyContinue).InstallDir};if($f){$exe=Join-Path $f 'RadeonSoftware.exe';if(Test-Path $exe){Start-Process $exe;exit}};$regs=@('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*');foreach($r in $regs){$e=Get-ItemProperty $r -EA SilentlyContinue|Where-Object{$_.DisplayName -match 'AMD Software'}|Select-Object -First 1;if($e){if($e.InstallLocation){$exe=Get-ChildItem $e.InstallLocation -Filter 'RadeonSoftware.exe' -Recurse -Depth 3 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($exe){Start-Process $exe;exit}};if($e.DisplayIcon){$i=($e.DisplayIcon -split ',')[0].Trim([char]34);if($i -and (Test-Path $i)){Start-Process $i;exit}}}};$drives=Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue|Select-Object -Exp Root;foreach($d in $drives){$exe=Get-ChildItem @($d+'Program Files\AMD',$d+'Program Files (x86)\AMD') -Filter 'RadeonSoftware.exe' -Recurse -Depth 5 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($exe){Start-Process $exe;exit}};Start-Process 'https://www.amd.com/en/technologies/software'"`, description: "Opens AMD Software: Adrenalin Edition. Registry-first detection across all drives. Falls back to AMD download page if not installed." },
        "power-balanced": { name: "Switched to Balanced Power Plan", command: "powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e", description: "Active power plan set to Balanced." },
        "power-high": { name: "Switched to High Performance", command: "powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c", description: "Active power plan set to High Performance." },
        "power-ultimate": { name: "Switched to Ultimate Performance", command: `powershell -NoProfile -Command "$guid='e9a42b02-d5df-448d-aa00-03f14749eb61';$list=powercfg /list 2>&1;if(-not($list|Select-String $guid)){powercfg /duplicatescheme $guid|Out-Null};powercfg /setactive $guid;Write-Output 'Ultimate Performance plan activated.'"`, description: "Ultimate Performance plan enabled and set as active." },
        "power-options": { name: "Power Options", command: "control.exe powercfg.cpl", description: "Opened Power Options in Control Panel." },
        "hwinfo": { name: "HWiNFO64", command: String.raw`powershell -NoProfile -Command "$p=@('C:\Program Files\HWiNFO64\HWiNFO64.exe','C:\Program Files (x86)\HWiNFO64\HWiNFO64.exe','C:\HWiNFO64\HWiNFO64.exe');$f=$p|Where-Object{Test-Path $_}|Select-Object -First 1;if($f){Start-Process $f}else{Start-Process 'https://www.hwinfo.com/download/'}"`, description: "Launched HWiNFO64. Falls back to download page if not installed." },
        "gpuz": { name: "GPU-Z", command: String.raw`powershell -NoProfile -Command "$p=Get-ChildItem 'C:\Program Files','C:\Program Files (x86)','C:\GPU-Z' -Filter 'GPU-Z.exe' -Recurse -Depth 3 -EA SilentlyContinue|Select-Object -First 1 -ExpandProperty FullName;if($p){Start-Process $p}else{Start-Process 'https://www.techpowerup.com/download/techpowerup-gpu-z/'}"`, description: "Launched GPU-Z. Falls back to download page if not installed." },
        "cpuz": { name: "CPU-Z", command: String.raw`powershell -NoProfile -Command "$p=@('C:\Program Files\CPUID\CPU-Z\cpuz_x64.exe','C:\Program Files (x86)\CPUID\CPU-Z\cpuz.exe','C:\CPU-Z\cpuz_x64.exe');$f=$p|Where-Object{Test-Path $_}|Select-Object -First 1;if($f){Start-Process $f}else{Start-Process 'https://www.cpuid.com/softwares/cpu-z.html'}"`, description: "Launched CPU-Z. Falls back to download page if not installed." },
        "msconfig": { name: "System Configuration", command: "msconfig", description: "Opened System Configuration (msconfig)." },
        "eventvwr": { name: "Event Viewer", command: "eventvwr.msc", description: "Opened Windows Event Viewer." },
        "services": { name: "Services Manager", command: "services.msc", description: "Opened Windows Services Manager." },
        "devmgmt": { name: "Device Manager", command: "devmgmt.msc", description: "Opened Device Manager." },
        "resmon": { name: "Resource Monitor", command: "resmon.exe", description: "Opened Windows Resource Monitor." },
      };

      const info = commands[action];

      if (process.platform !== "win32") {
        return res.json({ success: true, action, ...info, output: "Windows only." });
      }

      const TERMINAL_ACTIONS = new Set([
        "checkdisk", "network-reset",
      ]);
      const PS_ACTIONS = new Set(["empty-standby-memory"]);
      const GUI_ACTIONS = new Set([
        "open-system-restore", "disk-cleanup",
        "sfc", "dism",
        "defrag", "nvidia-cp", "nvidia-app", "windows-update",
        "dxdiag",
        "amd-software", "power-options",
        "hwinfo", "gpuz", "cpuz",
        "msconfig", "eventvwr", "services", "devmgmt", "resmon",
      ]);

      if (PS_ACTIONS.has(action)) {
        const output = await runPowerShell(info.command, 20000);
        return res.json({ success: true, action, ...info, output: output || "Done." });
      }

      if (GUI_ACTIONS.has(action)) {
        spawn(info.command, [], { detached: true, stdio: "ignore", shell: true, windowsHide: true } as any);
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
    // Update detection is based on whether a newer GitHub release exists after
    // the BUILD_DATE — no hardcoded version strings needed.
    const BUILD_DATE = new Date("2026-03-22T00:00:00Z");

    try {
      const response = await fetch(
        "https://api.github.com/repos/JaidenGoode/JGoode-s-AIO-PC-Tool/releases/latest",
        { headers: { "User-Agent": "JGoode-AIO-PC-Tool" } }
      );

      if (response.status === 404) {
        return res.json({
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

      const releaseDate = new Date(release.published_at);
      res.json({
        isUpToDate: releaseDate <= BUILD_DATE,
        releaseUrl: release.html_url,
        releaseName: release.name || release.tag_name,
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

      const SOURCE_DIRS = ["client", "electron", "server", "shared", "script", "tweaks"];
      const ROOT_FILES = [
        "package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts",
        "postcss.config.js", "drizzle.config.ts", "components.json", "replit.md", "README.md",
        ".gitignore", "electron-builder.json", "BUILD_EXE.bat",
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

  // ── STARTUP MANAGER ───────────────────────────────────────────────────────
  app.get("/api/startup", async (_req, res) => {
    const script = `
$items = [System.Collections.Generic.List[object]]::new()

# Returns $true (enabled) or $false (disabled) by reading StartupApproved binary.
# Byte[0] = 2 means enabled, 3 means disabled. Absent entry = enabled (Windows default).
function Get-Approved {
  param([string]$regPath,[string]$valName)
  try {
    if (Test-Path $regPath) {
      $val = (Get-ItemProperty -Path $regPath -Name $valName -ErrorAction SilentlyContinue).$valName
      if ($null -ne $val) {
        $arr = [byte[]]$val
        if ($arr.Length -ge 1) { return ($arr[0] -ne 3) }
      }
    }
  } catch {}
  return $true
}

# Helper to read a Run key and emit items
function Read-RunKey {
  param([string]$regPath,[string]$approvedPath,[string]$source,[bool]$admin)
  if (-not (Test-Path $regPath)) { return }
  try {
    (Get-ItemProperty $regPath -ErrorAction SilentlyContinue).PSObject.Properties |
      Where-Object { $_.Name -notlike 'PS*' -and $_.Name -ne '' } |
      ForEach-Object {
        $en = Get-Approved $approvedPath $_.Name
        $script:items.Add([PSCustomObject]@{
          name         = $_.Name
          command      = [string]$_.Value
          source       = $source
          enabled      = [bool]$en
          requiresAdmin= $admin
        })
      }
  } catch {}
}

# HKCU 64-bit Run
Read-RunKey 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' 'HKCU\\Run' $false

# HKLM 64-bit Run
Read-RunKey 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' 'HKLM\\Run' $true

# HKLM 32-bit Run (WOW6432Node) - many 32-bit apps register here
Read-RunKey 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run' 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32' 'HKLM\\Run32' $true

# User Startup Folder
try {
  $sf = [System.Environment]::GetFolderPath('Startup')
  if ($sf -and (Test-Path $sf)) {
    Get-ChildItem $sf -File -ErrorAction SilentlyContinue | ForEach-Object {
      $en = Get-Approved 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder' $_.Name
      $items.Add([PSCustomObject]@{name=$_.BaseName;command=$_.FullName;source='Startup\\User';enabled=[bool]$en;requiresAdmin=$false})
    }
  }
} catch {}

# All Users Startup Folder
try {
  $sf = [System.Environment]::GetFolderPath('CommonStartup')
  if ($sf -and (Test-Path $sf)) {
    Get-ChildItem $sf -File -ErrorAction SilentlyContinue | ForEach-Object {
      $en = Get-Approved 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder' $_.Name
      $items.Add([PSCustomObject]@{name=$_.BaseName;command=$_.FullName;source='Startup\\All';enabled=[bool]$en;requiresAdmin=$true})
    }
  }
} catch {}

if ($items.Count -eq 0) { Write-Output '[]'; exit }
$items | ConvertTo-Json -Compress -Depth 3
`;
    try {
      const out = (await runPowerShell(script, 15000)).trim();
      if (!out || out === "null") return res.json([]);
      // Detect PowerShell errors (output won't start with [ or {)
      const firstChar = out[0];
      if (firstChar !== "[" && firstChar !== "{") {
        return res.status(500).json({ error: out.slice(0, 300) });
      }
      let parsed = JSON.parse(out);
      if (!Array.isArray(parsed)) parsed = [parsed];
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to list startup items" });
    }
  });

  app.post("/api/startup/toggle", async (req, res) => {
    const { name, source, enabled } = req.body as { name: string; source: string; enabled: boolean };
    if (!name || !source) return res.status(400).json({ error: "Missing name or source" });
    const enableFlag = enabled ? "$true" : "$false";
    const safeName = name.replace(/'/g, "''");
    const script = `
$ErrorActionPreference = 'Stop'
$enable    = ${enableFlag}
$bytes     = if ($enable) { [byte[]]@(2,0,0,0,0,0,0,0,0,0,0,0) } else { [byte[]]@(3,0,0,0,0,0,0,0,0,0,0,0) }
$itemName  = '${safeName}'
$itemSource= '${source}'

function Set-Approved {
  param([string]$regPath,[string]$valName)
  try {
    if (!(Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
    Set-ItemProperty -Path $regPath -Name $valName -Value $bytes -Type Binary -ErrorAction Stop
  } catch {
    Write-Error "Registry write failed for '$valName' at '$regPath': $_"
    exit 1
  }
}

switch ($itemSource) {
  'HKCU\\Run' {
    Set-Approved 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' $itemName
  }
  'HKLM\\Run' {
    Set-Approved 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' $itemName
  }
  'HKLM\\Run32' {
    Set-Approved 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32' $itemName
  }
  'Startup\\User' {
    $sf = [System.Environment]::GetFolderPath('Startup')
    $f  = Get-ChildItem $sf -File -ErrorAction SilentlyContinue |
            Where-Object { $_.BaseName -eq $itemName } | Select-Object -First 1
    if (-not $f) { Write-Error "Startup folder file not found: $itemName"; exit 1 }
    Set-Approved 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder' $f.Name
  }
  'Startup\\All' {
    $sf = [System.Environment]::GetFolderPath('CommonStartup')
    $f  = Get-ChildItem $sf -File -ErrorAction SilentlyContinue |
            Where-Object { $_.BaseName -eq $itemName } | Select-Object -First 1
    if (-not $f) { Write-Error "Common startup folder file not found: $itemName"; exit 1 }
    Set-Approved 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder' $f.Name
  }
  default {
    Write-Error "Unknown source: $itemSource"; exit 1
  }
}
Write-Output 'OK'
`;
    try {
      const out = (await runPowerShell(script, 10000)).trim();
      if (!out.includes("OK")) {
        return res.status(500).json({ error: out || "Toggle script produced no output" });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Toggle failed" });
    }
  });

  // ── Downloadable profiles ──────────────────────────────────────────
  // In Electron production, files are in process.resourcesPath/profiles (extraResources)
  // In development, they live at server/profiles/ relative to CWD
  const PROFILES_DIR = process.env.ELECTRON_RESOURCES_PATH
    ? path.join(process.env.ELECTRON_RESOURCES_PATH, "profiles")
    : fs.existsSync(path.resolve(process.cwd(), "server", "profiles"))
      ? path.resolve(process.cwd(), "server", "profiles")
      : path.resolve(process.cwd(), "profiles");
  app.get("/api/profiles/:filename", (req, res) => {
    const name = path.basename(req.params.filename);
    const allowed = ["JsFortniteNPI.nip", "JsTCPOptimizer.spg"];
    if (!allowed.includes(name)) return res.status(404).json({ error: "Not found" });
    const filePath = path.join(PROFILES_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing" });
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath);
  });

  return httpServer;
}
