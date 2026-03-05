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

function getFirefoxCacheDirs(localDir: string, roamingDir: string): string[] {
  const dirs: string[] = [];
  for (const base of [localDir, roamingDir]) {
    const profilesDir = path.join(base, "Mozilla", "Firefox", "Profiles");
    try {
      if (fs.existsSync(profilesDir)) {
        const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            dirs.push(path.join(profilesDir, entry.name, "cache2"));
            dirs.push(path.join(profilesDir, entry.name, "thumbnails"));
          }
        }
      }
    } catch {}
  }
  return dirs;
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
        description: "Chrome, Edge and Firefox browser cache files",
        paths: [
          path.join(local, "Google", "Chrome", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Google", "Chrome", "User Data", "Default", "Code Cache"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Cache", "Cache_Data"),
          path.join(local, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
          ...getFirefoxCacheDirs(local, roaming),
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
      const isValidTemp = (t: unknown): t is number =>
        typeof t === "number" && isFinite(t) && t > 10 && t < 115;

      const [cpuTemp, graphics] = await Promise.all([
        si.cpuTemperature(),
        si.graphics(),
      ]);

      const controllers = graphics.controllers || [];
      const gpu =
        controllers.find((c) =>
          /nvidia|amd|radeon/i.test(c.vendor || c.model || "")
        ) || controllers[0];

      let cpuCurrent: number | null = null;
      let cpuMax: number | null = null;

      if (isValidTemp(cpuTemp.main)) {
        cpuCurrent = Math.round(cpuTemp.main);
      } else if (cpuTemp.socket?.length) {
        const valid = cpuTemp.socket.filter(isValidTemp);
        if (valid.length) cpuCurrent = Math.round(Math.max(...valid));
      }
      if (!cpuCurrent && cpuTemp.cores?.length) {
        const valid = cpuTemp.cores.filter(isValidTemp);
        if (valid.length) cpuCurrent = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      }
      if (isValidTemp(cpuTemp.max)) cpuMax = Math.round(cpuTemp.max);

      if (cpuCurrent === null && process.platform === "win32") {
        const psScript = `
try {
  $tz = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -ErrorAction SilentlyContinue
  if ($tz) {
    $readings = @($tz) | ForEach-Object { [math]::Round($_.CurrentTemperature / 10 - 273.15, 0) } | Where-Object { $_ -gt 10 -and $_ -lt 115 }
    if ($readings) { ($readings | Sort-Object -Descending)[0] }
  }
} catch {}`;
        const output = await runPowerShell(psScript, 6000).catch(() => "");
        const parsed = parseFloat(output.trim());
        if (isValidTemp(parsed)) cpuCurrent = Math.round(parsed);
      }

      const gpuTemp = (gpu as any)?.temperatureGpu ?? null;

      res.json({
        cpu: {
          current: cpuCurrent,
          max: cpuMax,
        },
        gpu: {
          current: isValidTemp(gpuTemp) ? Math.round(gpuTemp) : null,
        },
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

  // ── Cleaner: Scan ──────────────────────────────────────────────────────────
  app.get("/api/cleaner/scan", async (_req, res) => {
    try {
      const results = await Promise.all(
        CLEAN_CATEGORIES.map(async (cat) => {
          let totalSize = 0;
          let totalCount = 0;
          for (const p of cat.paths) {
            const expanded = expandPath(p);
            try {
              await fs.promises.access(expanded);
              const { size, count } = await getDirSize(expanded);
              totalSize += size;
              totalCount += count;
            } catch {}
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
        if (isWupdate) {
          await runCmd("net stop wuauserv 2>nul", 8000).catch(() => {});
        }

        for (const p of cat.paths) {
          const expanded = expandPath(p);
          try {
            await fs.promises.access(expanded);
            freed += await deleteContents(expanded);
          } catch {}
        }

        if (isWupdate) {
          await runCmd("net start wuauserv 2>nul", 8000).catch(() => {});
        }

        totalFreed += freed;
        cleaned.push(cat.name);
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
        "windows-update-security": { name: "Windows Update Security Only", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 0 /f', description: "Security updates only." },
        "location-on": { name: "Enable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 0 /f && sc config lfsvc start= auto && net start lfsvc', description: "Re-enables Windows Location Services." },
        "location-off": { name: "Disable Location Services", command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v "DisableLocation" /t REG_DWORD /d 1 /f && sc config lfsvc start= disabled && net stop lfsvc', description: "Completely disables Windows Location Services." },
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
