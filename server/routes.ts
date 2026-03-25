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
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function runPowerShell(script: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `jgoode-ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`);
    try {
      fs.writeFileSync(tmpFile, '\uFEFF' + script, "utf-8");
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
  group: "system" | "apps" | "games" | "browser" | "privacy" | "recycle" | "downloads" | "backup";
  name: string;
  description: string;
  paths: string[];
  globDir?: string;
  globPattern?: string;
  subDirScan?: { parent: string; subdir: string }[];
  autoSelect?: boolean;
  warnNote?: string;
  // Paths checked to determine if the app is installed — any one existing = installed
  installCheck?: string[];
  // PowerShell script for scanning — must output "BYTES COUNT" on one line
  psScan?: string;
  // PowerShell script for cleaning — must output freed BYTES on one line
  psClean?: string;
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

  if (!isWin) return [];

  return [
    // ── SYSTEM JUNK ────────────────────────────────────────────────────────────
    {
      id: "temp",
      group: "system",
      name: "Temporary Files",
      description: "User & Windows temp files — %TEMP%, %TMP%, and C:\\Windows\\Temp",
      paths: [],
      psScan: `$seen=@{};$t=0L;$c=0;foreach($base in @($env:TEMP,$env:TMP,'C:\\Windows\\Temp')|Where-Object{$_}){$key=$base.ToLower();if($seen[$key]){continue};$seen[$key]=$true;if(Test-Path $base){Get-ChildItem $base -Force -EA SilentlyContinue|ForEach-Object{try{if($_.PSIsContainer){$s=(Get-ChildItem $_.FullName -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c++}else{$t+=$_.Length;$c++}}catch{}}}};Write-Output "$t $c"`,
      psClean: `$seen=@{};$t=0L;foreach($base in @($env:TEMP,$env:TMP,'C:\\Windows\\Temp')|Where-Object{$_}){$key=$base.ToLower();if($seen[$key]){continue};$seen[$key]=$true;if(Test-Path $base){Get-ChildItem $base -Force -EA SilentlyContinue|Where-Object{$_.Extension.ToLower() -ne '.ps1'}|ForEach-Object{try{$sz=0L;if($_.PSIsContainer){$sz=[long]((Get-ChildItem $_.FullName -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum);Remove-Item $_.FullName -Recurse -Force -EA SilentlyContinue}else{$sz=$_.Length;Remove-Item $_.FullName -Force -EA SilentlyContinue};$t+=$sz}catch{}}}};Write-Output $t`,
    },
    {
      id: "prefetch",
      group: "system",
      name: "Prefetch Cache",
      description: "Windows app launch prefetch .pf files — rebuilt automatically on next launch",
      paths: [],
      psScan: `$p='C:\\Windows\\Prefetch';$t=0L;$c=0;if(Test-Path $p){$items=Get-ChildItem $p -File -Filter '*.pf' -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$c=$items.Count};Write-Output "$t $c"`,
      psClean: `$p='C:\\Windows\\Prefetch';$t=0L;if(Test-Path $p){$items=Get-ChildItem $p -File -Filter '*.pf' -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$items|Remove-Item -Force -EA SilentlyContinue};Write-Output $t`,
    },
    {
      id: "wupdate",
      group: "system",
      name: "Windows Update Cache",
      description: "Downloaded Windows Update packages — safe to clear after updates finish installing",
      paths: [],
      psScan: `$p='C:\\Windows\\SoftwareDistribution\\Download';$t=0L;$c=0;if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$c=($items|Where-Object{-not $_.PSIsContainer}).Count};Write-Output "$t $c"`,
      psClean: `$p='C:\\Windows\\SoftwareDistribution\\Download';$t=0L;Stop-Service wuauserv -Force -EA SilentlyContinue;Stop-Service bits -Force -EA SilentlyContinue;if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue};Start-Service wuauserv -EA SilentlyContinue;Start-Service bits -EA SilentlyContinue;Write-Output $t`,
    },
    {
      id: "deliveryopt",
      group: "system",
      name: "Delivery Optimization",
      description: "Windows P2P update delivery cache used to share updates between devices on your network",
      paths: [],
      psScan: `$t=0L;$c=0;$roots=@('C:\\Windows\\SoftwareDistribution\\DeliveryOptimization','C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization','C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization');foreach($root in $roots){try{if(Test-Path -LiteralPath $root -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $root -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}}catch{}};Write-Output "$t $c"`,
      psClean: `$t=0L;Stop-Service DoSvc -Force -EA SilentlyContinue;Start-Sleep -Milliseconds 800;$roots=@('C:\\Windows\\SoftwareDistribution\\DeliveryOptimization','C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization','C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization');foreach($root in $roots){try{if(Test-Path -LiteralPath $root -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $root -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $root -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}}catch{}};Start-Service DoSvc -EA SilentlyContinue;Write-Output $t`,
    },
    {
      id: "errorreports",
      group: "system",
      name: "Error Reports",
      description: "Windows crash and error report archives (WER) — user and system-wide",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportArchive","$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportQueue","C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive","C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportArchive","$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportQueue","C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive","C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "logs",
      group: "system",
      name: "System Logs",
      description: "Windows CBS, DISM, MoSetup, and Panther setup log and .etl trace files",
      paths: [],
      psScan: `$t=0L;$c=0;$exts=@('.log','.etl','.cab','.txt');foreach($p in @('C:\\Windows\\Logs\\CBS','C:\\Windows\\Logs\\DISM','C:\\Windows\\Logs\\MoSetup','C:\\Windows\\Panther')){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -File -Force -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()};$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;$exts=@('.log','.etl','.cab','.txt');foreach($p in @('C:\\Windows\\Logs\\CBS','C:\\Windows\\Logs\\DISM','C:\\Windows\\Logs\\MoSetup','C:\\Windows\\Panther')){if(Test-Path $p){Get-ChildItem $p -Recurse -File -Force -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()}|ForEach-Object{try{$t+=$_.Length;Remove-Item $_.FullName -Force -EA Stop}catch{}}}};Write-Output $t`,
    },
    {
      id: "dumpfiles",
      group: "system",
      name: "Memory Dump Files",
      description: "Windows crash minidumps, full memory dumps, and local app crash dumps",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @('C:\\Windows\\Minidump',"$env:LOCALAPPDATA\\CrashDumps")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};$dm='C:\\Windows\\MEMORY.DMP';if(Test-Path $dm){try{$t+=(Get-Item $dm).Length;$c++}catch{}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @('C:\\Windows\\Minidump',"$env:LOCALAPPDATA\\CrashDumps")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};$dm='C:\\Windows\\MEMORY.DMP';if(Test-Path $dm){try{$t+=(Get-Item $dm).Length;Remove-Item $dm -Force -EA Stop}catch{}};Write-Output $t`,
    },
    {
      id: "thumbnails",
      group: "system",
      name: "Thumbnail Cache",
      description: "Windows Explorer thumbnail cache (thumbcache_*.db) — rebuilt automatically on next browse",
      paths: [],
      globDir: path.join(local, "Microsoft", "Windows", "Explorer"),
      globPattern: "thumbcache_*.db",
    },
    {
      id: "iconcache",
      group: "system",
      name: "Icon Cache",
      description: "Windows icon database files (iconcache_*.db) — rebuilt automatically on next login",
      paths: [],
      psScan: `$dir="$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer";$t=0L;$c=0;if(Test-Path $dir){$items=Get-ChildItem $dir -File -Force -EA SilentlyContinue|Where-Object{$_.Name -like 'iconcache_*.db'};$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$c=$items.Count};Write-Output "$t $c"`,
      psClean: `$dir="$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer";$t=0L;$items=@();if(Test-Path $dir){$items=Get-ChildItem $dir -File -Force -EA SilentlyContinue|Where-Object{$_.Name -like 'iconcache_*.db'}};if($items.Count -gt 0){Stop-Process -Name explorer -Force -EA SilentlyContinue;Start-Sleep -Milliseconds 800;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$items|ForEach-Object{Remove-Item $_.FullName -Force -EA SilentlyContinue};Start-Sleep -Milliseconds 300;Start-Process explorer};Write-Output $t`,
    },
    {
      id: "recentfiles",
      group: "system",
      name: "Recent Files Cache",
      description: "Windows jump list automatic destinations and custom destinations — clears recent files list",
      autoSelect: false,
      warnNote: "Clears your recent files list in Windows Explorer and Start menu jump lists.",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:APPDATA\\Microsoft\\Windows\\Recent\\AutomaticDestinations","$env:APPDATA\\Microsoft\\Windows\\Recent\\CustomDestinations")){if(Test-Path $p){$items=Get-ChildItem $p -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:APPDATA\\Microsoft\\Windows\\Recent\\AutomaticDestinations","$env:APPDATA\\Microsoft\\Windows\\Recent\\CustomDestinations")){if(Test-Path $p){$items=Get-ChildItem $p -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$items|ForEach-Object{Remove-Item $_.FullName -Force -EA SilentlyContinue}}};Write-Output $t`,
    },
    {
      id: "shadercache",
      group: "system",
      name: "DirectX Shader Cache",
      description: "D3D, NVIDIA, AMD, and Intel GPU shader caches — rebuilt automatically on next game launch",
      autoSelect: false,
      warnNote: "GPU rebuilds shaders on first game launch — may cause brief stutter. Use to fix crashes or black screens.",
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
      id: "localservice",
      group: "system",
      name: "Service Profile Temps",
      description: "LocalService, NetworkService and LocalSystem profile temp caches — built up by Windows system services",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @('C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\Temp','C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\LocalLow\\Temp','C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Temp','C:\\Windows\\System32\\config\\systemprofile\\AppData\\Local\\Temp')){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @('C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\Temp','C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\LocalLow\\Temp','C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Temp','C:\\Windows\\System32\\config\\systemprofile\\AppData\\Local\\Temp')){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "event_logs",
      group: "system",
      name: "Windows Event Logs",
      description: "Delivery Optimization, Update Orchestrator, WDI diagnostic, and Windows Update event log files",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @('C:\\Windows\\Logs\\dosvc','C:\\ProgramData\\USOShared\\Logs','C:\\Windows\\System32\\WDI\\LogFiles','C:\\Windows\\SoftwareDistribution\\EventCache')){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @('C:\\Windows\\Logs\\dosvc','C:\\ProgramData\\USOShared\\Logs','C:\\Windows\\System32\\WDI\\LogFiles','C:\\Windows\\SoftwareDistribution\\EventCache')){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "cert_cache",
      group: "system",
      name: "Windows Certificate Cache",
      description: "Cached certification files and SoftwareDistribution DataStore logs — safe to clear, rebuilt automatically",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:WINDIR\\SoftwareDistribution\\DataStore\\Logs","$env:WINDIR\\System32\\LogFiles\\WMI")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:WINDIR\\SoftwareDistribution\\DataStore\\Logs","$env:WINDIR\\System32\\LogFiles\\WMI")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },

    // ── APP JUNK ───────────────────────────────────────────────────────────────
    {
      id: "discord",
      group: "apps",
      name: "Discord",
      description: "Discord app cache, GPU cache, code cache, and dawn cache",
      warnNote: "Right-click the Discord tray icon → Quit before cleaning.",
      installCheck: [
        path.join(roaming, "discord"),
        path.join(local, "Discord"),
      ],
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
      group: "apps",
      name: "Spotify",
      description: "Spotify offline storage cache and data cache",
      installCheck: [path.join(roaming, "Spotify"), path.join(local, "Spotify")],
      paths: [
        path.join(roaming, "Spotify", "Storage"),
        path.join(local, "Spotify", "Storage"),
        path.join(local, "Spotify", "Data"),
      ],
    },
    {
      id: "teams",
      group: "apps",
      name: "Microsoft Teams",
      description: "Teams cache, GPU cache, and code cache — Classic and New Teams (2.0)",
      warnNote: "Close Teams before cleaning.",
      installCheck: [
        path.join(roaming, "Microsoft", "Teams"),
        path.join(local, "Microsoft", "Teams"),
        path.join(local, "Microsoft", "Teams", "current"),
        path.join(local, "Packages", "MSTeams_8wekyb3d8bbwe"),
      ],
      paths: [],
      psScan: `$t=0L;$c=0;$dirs=@("$env:APPDATA\\Microsoft\\Teams\\Cache","$env:APPDATA\\Microsoft\\Teams\\Code Cache","$env:APPDATA\\Microsoft\\Teams\\GPUCache","$env:APPDATA\\Microsoft\\Teams\\Application Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\Code Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\GPUCache");$pkg="$env:LOCALAPPDATA\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\Microsoft\\MSTeams";if(Test-Path $pkg){$dirs+="$pkg\\EBWebView\\Default\\Cache","$pkg\\EBWebView\\Default\\Code Cache","$pkg\\EBWebView\\Default\\GPUCache"};foreach($p in $dirs){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;$dirs=@("$env:APPDATA\\Microsoft\\Teams\\Cache","$env:APPDATA\\Microsoft\\Teams\\Code Cache","$env:APPDATA\\Microsoft\\Teams\\GPUCache","$env:APPDATA\\Microsoft\\Teams\\Application Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\Code Cache","$env:LOCALAPPDATA\\Microsoft\\Teams\\GPUCache");$pkg="$env:LOCALAPPDATA\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\Microsoft\\MSTeams";if(Test-Path $pkg){$dirs+="$pkg\\EBWebView\\Default\\Cache","$pkg\\EBWebView\\Default\\Code Cache","$pkg\\EBWebView\\Default\\GPUCache"};foreach($p in $dirs){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "zoom",
      group: "apps",
      name: "Zoom",
      description: "Zoom meeting logs and local data cache",
      installCheck: [path.join(roaming, "Zoom"), path.join(local, "Zoom")],
      paths: [
        path.join(roaming, "Zoom", "logs"),
        path.join(local, "Zoom", "logs"),
        path.join(local, "Zoom", "data"),
      ],
    },
    {
      id: "slack",
      group: "apps",
      name: "Slack",
      description: "Slack app cache, GPU cache, and code cache",
      warnNote: "Close Slack before cleaning.",
      installCheck: [path.join(roaming, "Slack")],
      paths: [
        path.join(roaming, "Slack", "Cache", "Cache_Data"),
        path.join(roaming, "Slack", "Code Cache"),
        path.join(roaming, "Slack", "GPUCache"),
        path.join(roaming, "Slack", "DawnCache"),
      ],
    },
    {
      id: "obs",
      group: "apps",
      name: "OBS Studio",
      description: "OBS Studio log files",
      installCheck: [path.join(roaming, "obs-studio")],
      paths: [
        path.join(roaming, "obs-studio", "logs"),
        path.join(roaming, "obs-studio", "crashes"),
      ],
    },
    {
      id: "roblox",
      group: "apps",
      name: "Roblox",
      description: "Roblox player log files and local cache",
      installCheck: [path.join(local, "Roblox"), path.join(local, "Roblox Player")],
      paths: [
        path.join(local, "Roblox", "logs"),
        path.join(local, "Roblox Player", "logs"),
        path.join(tmp, "RobloxLogs"),
      ],
    },
    {
      id: "vscode",
      group: "apps",
      name: "Visual Studio Code",
      description: "VS Code browser cache, GPU cache, and code cache (Stable and Insiders)",
      installCheck: [path.join(roaming, "Code"), path.join(roaming, "Code - Insiders")],
      paths: [
        path.join(roaming, "Code", "Cache", "Cache_Data"),
        path.join(roaming, "Code", "Code Cache"),
        path.join(roaming, "Code", "GPUCache"),
        path.join(roaming, "Code", "CachedData"),
        path.join(roaming, "Code - Insiders", "Cache", "Cache_Data"),
        path.join(roaming, "Code - Insiders", "Code Cache"),
        path.join(roaming, "Code - Insiders", "GPUCache"),
        path.join(roaming, "Code - Insiders", "CachedData"),
      ],
    },
    {
      id: "vlc",
      group: "apps",
      name: "VLC Media Player",
      description: "VLC art cache (thumbnail images for media library)",
      installCheck: [path.join(roaming, "vlc")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:APPDATA\\vlc\\art_cache")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:APPDATA\\vlc\\art_cache")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "riot",
      group: "apps",
      name: "Riot Client / Valorant / LoL",
      description: "Riot Client log files and browser cache (Valorant, League of Legends, TFT)",
      installCheck: [path.join(local, "Riot Games"), path.join(roaming, "Riot Games")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\Riot Games\\Riot Client\\Logs","$env:LOCALAPPDATA\\Riot Games\\Riot Client\\Cache","$env:APPDATA\\Riot Games\\Riot Client\\Cache")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\Riot Games\\Riot Client\\Logs","$env:LOCALAPPDATA\\Riot Games\\Riot Client\\Cache","$env:APPDATA\\Riot Games\\Riot Client\\Cache")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "minecraft",
      group: "apps",
      name: "Minecraft Java",
      description: "Minecraft Java Edition log files (.log, .log.gz archives)",
      installCheck: [path.join(roaming, ".minecraft")],
      paths: [],
      psScan: `$t=0L;$c=0;$p="$env:APPDATA\\.minecraft\\logs";if(Test-Path $p){$items=Get-ChildItem $p -File -Force -EA SilentlyContinue|Where-Object{$_.Name -ne 'latest.log'};$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$c=$items.Count};Write-Output "$t $c"`,
      psClean: `$t=0L;$p="$env:APPDATA\\.minecraft\\logs";if(Test-Path $p){$items=Get-ChildItem $p -File -Force -EA SilentlyContinue|Where-Object{$_.Name -ne 'latest.log'};$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$items|ForEach-Object{Remove-Item $_.FullName -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "geforce",
      group: "apps",
      name: "NVIDIA App",
      description: "NVIDIA App and GeForce Experience CEF cache, NvContainer logs, and downloaded driver files",
      installCheck: [
        path.join(local, "NVIDIA", "NvApp"),
        path.join(local, "NVIDIA", "NvBackend"),
        path.join(local, "NVIDIA Corporation"),
      ],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\NVIDIA\\NvApp","$env:LOCALAPPDATA\\NVIDIA\\NvBackend\\CEF\\Cache","$env:LOCALAPPDATA\\NVIDIA Corporation\\NvContainer\\log","$env:LOCALAPPDATA\\NVIDIA Corporation\\Drs","$env:PROGRAMDATA\\NVIDIA Corporation\\Downloader","$env:LOCALAPPDATA\\NVIDIA\\NvApp\\WebCache")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\NVIDIA\\NvApp\\WebCache","$env:LOCALAPPDATA\\NVIDIA\\NvBackend\\CEF\\Cache","$env:LOCALAPPDATA\\NVIDIA Corporation\\NvContainer\\log","$env:PROGRAMDATA\\NVIDIA Corporation\\Downloader")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "adobecc",
      group: "apps",
      name: "Adobe Creative Cloud",
      description: "Adobe CC media cache files and Creative Cloud log files",
      installCheck: [path.join(roaming, "Adobe"), path.join(local, "Adobe")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:APPDATA\\Adobe\\Common\\Media Cache Files","$env:LOCALAPPDATA\\Adobe\\Common\\Media Cache Files","$env:APPDATA\\Adobe\\Common\\Media Cache","$env:LOCALAPPDATA\\Adobe\\Common\\Media Cache","$env:APPDATA\\Adobe\\Adobe Creative Cloud\\Logs","$env:LOCALAPPDATA\\Adobe\\Adobe Creative Cloud\\Logs")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:APPDATA\\Adobe\\Common\\Media Cache Files","$env:LOCALAPPDATA\\Adobe\\Common\\Media Cache Files","$env:APPDATA\\Adobe\\Common\\Media Cache","$env:LOCALAPPDATA\\Adobe\\Common\\Media Cache")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },

    // ── GAME JUNK ──────────────────────────────────────────────────────────────
    {
      id: "steam",
      group: "games",
      name: "Steam",
      description: "Steam HTML cache, GPU shader cache, launcher logs, and crash dumps (all install locations)",
      installCheck: [
        path.join(local, "Steam"),
        "C:\\Program Files (x86)\\Steam",
        "C:\\Program Files\\Steam",
      ],
      paths: [],
      psScan: `$t=0L;$c=0;$sp=(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam' -EA SilentlyContinue).SteamPath;$la="$env:LOCALAPPDATA\\Steam";$paths=@("$la\\htmlcache\\Cache","$la\\htmlcache\\Cache_Data","$la\\htmlcache\\Code Cache","$la\\htmlcache\\GPUCache","$la\\dumps","$la\\logs");if($sp -and (Test-Path -LiteralPath $sp -EA SilentlyContinue)){$paths+="$sp\\logs";$paths+="$sp\\dumps";$paths+="$sp\\htmlcache\\Cache";$paths+="$sp\\htmlcache\\Code Cache";$paths+="$sp\\htmlcache\\GPUCache"};foreach($p in $paths){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;$sp=(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam' -EA SilentlyContinue).SteamPath;$la="$env:LOCALAPPDATA\\Steam";$paths=@("$la\\htmlcache\\Cache","$la\\htmlcache\\Cache_Data","$la\\htmlcache\\Code Cache","$la\\htmlcache\\GPUCache","$la\\dumps","$la\\logs");if($sp -and (Test-Path -LiteralPath $sp -EA SilentlyContinue)){$paths+="$sp\\logs";$paths+="$sp\\dumps";$paths+="$sp\\htmlcache\\Cache";$paths+="$sp\\htmlcache\\Code Cache";$paths+="$sp\\htmlcache\\GPUCache"};foreach($p in $paths){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "epic",
      group: "games",
      name: "Epic Games",
      description: "Epic Games Launcher web cache and log files",
      installCheck: [path.join(local, "EpicGamesLauncher")],
      paths: [
        path.join(local, "EpicGamesLauncher", "Saved", "webcache_4430"),
        path.join(local, "EpicGamesLauncher", "Saved", "webcache"),
        path.join(local, "EpicGamesLauncher", "Saved", "Logs"),
      ],
    },
    {
      id: "gog",
      group: "games",
      name: "GOG Galaxy",
      description: "GOG Galaxy launcher cache and log files",
      installCheck: [path.join(local, "GOG.com")],
      paths: [
        path.join(local, "GOG.com", "Galaxy", "Cache"),
        path.join(local, "GOG.com", "Galaxy", "logs"),
      ],
    },
    {
      id: "ea",
      group: "games",
      name: "EA App",
      description: "EA Desktop / EA App log files and CEF browser cache",
      installCheck: [path.join(local, "Electronic Arts")],
      paths: [
        path.join(local, "Electronic Arts", "EA Desktop", "Logs"),
        path.join(local, "Electronic Arts", "EA Desktop", "CEF", "Cache"),
      ],
    },
    {
      id: "ubisoft",
      group: "games",
      name: "Ubisoft Connect",
      description: "Ubisoft Connect launcher cache and log files",
      installCheck: [path.join(local, "Ubisoft Game Launcher")],
      paths: [
        path.join(local, "Ubisoft Game Launcher", "logs"),
        path.join(local, "Ubisoft Game Launcher", "cache"),
      ],
    },
    {
      id: "battlenet",
      group: "games",
      name: "Battle.net",
      description: "Battle.net launcher cache and log files",
      installCheck: [path.join(local, "Battle.net")],
      paths: [
        path.join(local, "Battle.net", "Cache"),
        path.join(local, "Battle.net", "Logs"),
      ],
    },
    {
      id: "fortnite",
      group: "games",
      name: "Fortnite",
      description: "Fortnite game logs, crash dumps, and saved temporary files",
      installCheck: [],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\FortniteGame\\Saved\\Logs","$env:LOCALAPPDATA\\FortniteGame\\Saved\\Crashes","$env:LOCALAPPDATA\\FortniteGame\\Saved\\Config\\CrashReportClient")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\FortniteGame\\Saved\\Logs","$env:LOCALAPPDATA\\FortniteGame\\Saved\\Crashes","$env:LOCALAPPDATA\\FortniteGame\\Saved\\Config\\CrashReportClient")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "cod",
      group: "games",
      name: "Call of Duty / Activision",
      description: "Activision launcher logs, Warzone and COD cache — covers all COD titles via Battle.net and Activision app",
      installCheck: [],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\Activision","$env:LOCALAPPDATA\\Blizzard Entertainment\\Battle.net\\Logs","$env:APPDATA\\Battle.net\\Logs","$env:LOCALAPPDATA\\Battle.net\\Logs")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\Activision","$env:LOCALAPPDATA\\Blizzard Entertainment\\Battle.net\\Logs","$env:APPDATA\\Battle.net\\Logs","$env:LOCALAPPDATA\\Battle.net\\Logs")){if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "xbox_app",
      group: "games",
      name: "Xbox / Game Pass",
      description: "Microsoft Gaming App and Xbox app package cache — covers Game Pass installed game temp files",
      installCheck: [],
      paths: [],
      psScan: `$t=0L;$c=0;$pkgs=Get-ChildItem "$env:LOCALAPPDATA\\Packages" -Directory -Force -EA SilentlyContinue|Where-Object{$_.Name -like "Microsoft.GamingApp_*" -or $_.Name -like "Microsoft.XboxApp_*" -or $_.Name -like "Microsoft.Xbox.TCUI_*"};foreach($pkg in $pkgs){foreach($sub in @("AC\\Temp","AC\\INetCache","AC\\INetCookies","LocalCache\\Local\\Temp","TempState")){$p=Join-Path $pkg.FullName $sub;if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}}};Write-Output "$t $c"`,
      psClean: `$t=0L;$pkgs=Get-ChildItem "$env:LOCALAPPDATA\\Packages" -Directory -Force -EA SilentlyContinue|Where-Object{$_.Name -like "Microsoft.GamingApp_*" -or $_.Name -like "Microsoft.XboxApp_*" -or $_.Name -like "Microsoft.Xbox.TCUI_*"};foreach($pkg in $pkgs){foreach($sub in @("AC\\Temp","AC\\INetCache","AC\\INetCookies","LocalCache\\Local\\Temp","TempState")){$p=Join-Path $pkg.FullName $sub;if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}}};Write-Output $t`,
    },
    {
      id: "steam_gamelogs",
      group: "games",
      name: "Steam — Game Logs (Auto)",
      description: "Automatically scans every game installed across all Steam libraries for Logs, crash, and dump subfolders — picks up any game you own",
      installCheck: [],
      paths: [],
      psScan: `$t=0L;$c=0;$sp=(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam' -EA SilentlyContinue).SteamPath;if($sp){$libs=@("$sp\\steamapps\\common");$vdf="$sp\\steamapps\\libraryfolders.vdf";if(Test-Path $vdf -EA SilentlyContinue){(Get-Content $vdf -EA SilentlyContinue)|Select-String '"path"\\s+"([^"]+)"'|ForEach-Object{$lp=$_.Matches[0].Groups[1].Value -replace '\\\\\\\\','\\';$lc="$lp\\steamapps\\common";if($lp -and (Test-Path $lc -EA SilentlyContinue)){$libs+=$lc}}};foreach($lib in $libs){if(Test-Path $lib -EA SilentlyContinue){Get-ChildItem $lib -Directory -Force -EA SilentlyContinue|ForEach-Object{foreach($sub in @("Logs","logs","Crash","crash","Crashes","crashes","Dumps","dumps")){$ld=Join-Path $_.FullName $sub;if(Test-Path -LiteralPath $ld -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $ld -Recurse -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}}}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;$sp=(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam' -EA SilentlyContinue).SteamPath;if($sp){$libs=@("$sp\\steamapps\\common");$vdf="$sp\\steamapps\\libraryfolders.vdf";if(Test-Path $vdf -EA SilentlyContinue){(Get-Content $vdf -EA SilentlyContinue)|Select-String '"path"\\s+"([^"]+)"'|ForEach-Object{$lp=$_.Matches[0].Groups[1].Value -replace '\\\\\\\\','\\';$lc="$lp\\steamapps\\common";if($lp -and (Test-Path $lc -EA SilentlyContinue)){$libs+=$lc}}};foreach($lib in $libs){if(Test-Path $lib -EA SilentlyContinue){Get-ChildItem $lib -Directory -Force -EA SilentlyContinue|ForEach-Object{foreach($sub in @("Logs","logs","Crash","crash","Crashes","crashes","Dumps","dumps")){$ld=Join-Path $_.FullName $sub;if(Test-Path -LiteralPath $ld -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $ld -Recurse -File -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $ld -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}}}}}};Write-Output $t`,
    },
    {
      id: "epic_gamelogs",
      group: "games",
      name: "Epic — Game Logs (Auto)",
      description: "Reads Epic Games manifests to find every installed game and scans each one for Logs and Crashes folders — covers all current and future Epic titles",
      installCheck: [],
      paths: [],
      psScan: `$t=0L;$c=0;$mf="$env:ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";if(Test-Path $mf -EA SilentlyContinue){Get-ChildItem $mf -Filter "*.item" -File -Force -EA SilentlyContinue|ForEach-Object{try{$j=Get-Content $_.FullName -Raw -EA SilentlyContinue|ConvertFrom-Json -EA SilentlyContinue;if($j -and $j.InstallLocation -and (Test-Path $j.InstallLocation -EA SilentlyContinue)){foreach($sub in @("Logs","Saved\\Logs","Saved\\Crashes","Crashes","Saved\\Config\\CrashReportClient")){$p=Join-Path $j.InstallLocation $sub;if(Test-Path -LiteralPath $p -EA SilentlyContinue){$items=Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}}}}catch{}}};Write-Output "$t $c"`,
      psClean: `$t=0L;$mf="$env:ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";if(Test-Path $mf -EA SilentlyContinue){Get-ChildItem $mf -Filter "*.item" -File -Force -EA SilentlyContinue|ForEach-Object{try{$j=Get-Content $_.FullName -Raw -EA SilentlyContinue|ConvertFrom-Json -EA SilentlyContinue;if($j -and $j.InstallLocation -and (Test-Path $j.InstallLocation -EA SilentlyContinue)){foreach($sub in @("Logs","Saved\\Logs","Saved\\Crashes","Crashes","Saved\\Config\\CrashReportClient")){$p=Join-Path $j.InstallLocation $sub;if(Test-Path -LiteralPath $p -EA SilentlyContinue){$s=(Get-ChildItem -LiteralPath $p -Recurse -File -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem -LiteralPath $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}}}}catch{}}};Write-Output $t`,
    },

    // ── BROWSER JUNK (cache only) ───────────────────────────────────────────────
    {
      id: "chrome",
      group: "browser",
      name: "Google Chrome",
      description: "Chrome browser cache — all profiles auto-detected",
      warnNote: "Close Chrome before cleaning for best results.",
      installCheck: [path.join(local, "Google", "Chrome", "User Data")],
      subDirScan: [
        { parent: path.join(local, "Google", "Chrome", "User Data"), subdir: path.join("Cache", "Cache_Data") },
        { parent: path.join(local, "Google", "Chrome", "User Data"), subdir: "Code Cache" },
        { parent: path.join(local, "Google", "Chrome", "User Data"), subdir: "GPUCache" },
      ],
      paths: [],
    },
    {
      id: "edge",
      group: "browser",
      name: "Microsoft Edge",
      description: "Edge browser cache — all profiles auto-detected",
      warnNote: "Close Edge before cleaning for best results.",
      installCheck: [path.join(local, "Microsoft", "Edge", "User Data")],
      subDirScan: [
        { parent: path.join(local, "Microsoft", "Edge", "User Data"), subdir: path.join("Cache", "Cache_Data") },
        { parent: path.join(local, "Microsoft", "Edge", "User Data"), subdir: "Code Cache" },
        { parent: path.join(local, "Microsoft", "Edge", "User Data"), subdir: "GPUCache" },
      ],
      paths: [],
    },
    {
      id: "firefox",
      group: "browser",
      name: "Firefox",
      description: "Firefox browser cache — all profiles auto-detected",
      warnNote: "Close Firefox before cleaning for best results.",
      installCheck: [path.join(local, "Mozilla", "Firefox", "Profiles"), path.join(roaming, "Mozilla", "Firefox", "Profiles")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($base in @("$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles","$env:APPDATA\\Mozilla\\Firefox\\Profiles")){if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{$cache=Join-Path $_.FullName "cache2";if(Test-Path $cache){$items=Get-ChildItem $cache -Recurse -File -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=$items.Count}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($base in @("$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles","$env:APPDATA\\Mozilla\\Firefox\\Profiles")){if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{$cache=Join-Path $_.FullName "cache2";if(Test-Path $cache){$s=(Get-ChildItem $cache -Recurse -File -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $cache -Recurse -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}}}};Write-Output $t`,
    },
    {
      id: "operagx",
      group: "browser",
      name: "Opera GX",
      description: "Opera GX browser cache files",
      warnNote: "Close Opera GX before cleaning for best results.",
      installCheck: [
        path.join(roaming, "Opera Software", "Opera GX Stable"),
        path.join(local, "Opera Software", "Opera GX Stable"),
      ],
      paths: [
        path.join(roaming, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
        path.join(roaming, "Opera Software", "Opera GX Stable", "Code Cache"),
        path.join(roaming, "Opera Software", "Opera GX Stable", "GPUCache"),
        path.join(local, "Opera Software", "Opera GX Stable", "Cache", "Cache_Data"),
        path.join(local, "Opera Software", "Opera GX Stable", "Code Cache"),
        path.join(local, "Opera Software", "Opera GX Stable", "GPUCache"),
      ],
    },
    {
      id: "vivaldi",
      group: "browser",
      name: "Vivaldi",
      description: "Vivaldi browser cache files — all profiles auto-detected",
      warnNote: "Close Vivaldi before cleaning for best results.",
      installCheck: [path.join(local, "Vivaldi", "User Data")],
      subDirScan: [
        { parent: path.join(local, "Vivaldi", "User Data"), subdir: path.join("Cache", "Cache_Data") },
        { parent: path.join(local, "Vivaldi", "User Data"), subdir: "Code Cache" },
        { parent: path.join(local, "Vivaldi", "User Data"), subdir: "GPUCache" },
      ],
      paths: [],
    },
    {
      id: "brave",
      group: "browser",
      name: "Brave",
      description: "Brave browser cache — all profiles auto-detected",
      warnNote: "Close Brave before cleaning for best results.",
      installCheck: [path.join(local, "BraveSoftware", "Brave-Browser", "User Data")],
      subDirScan: [
        { parent: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), subdir: path.join("Cache", "Cache_Data") },
        { parent: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), subdir: "Code Cache" },
        { parent: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), subdir: "GPUCache" },
      ],
      paths: [],
    },

    // ── BROWSER PRIVACY (history, cookies, login data) ─────────────────────────
    {
      id: "chromeprivacy",
      group: "privacy",
      name: "Chrome History & Cookies",
      description: "Chrome browsing history, cookies, and saved form/login data — all profiles",
      autoSelect: false,
      warnNote: "Close Chrome completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(local, "Google", "Chrome", "User Data")],
      paths: [],
      psScan: `$d="$env:LOCALAPPDATA\\Google\\Chrome\\User Data";$t=0L;$c=0;if(Test-Path $d){Get-ChildItem $d -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}};Write-Output "$t $c"`,
      psClean: `$d="$env:LOCALAPPDATA\\Google\\Chrome\\User Data";$t=0L;if(Test-Path $d){Get-ChildItem $d -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}};Write-Output $t`,
    },
    {
      id: "edgeprivacy",
      group: "privacy",
      name: "Edge History & Cookies",
      description: "Edge browsing history, cookies, and saved form/login data — all profiles",
      autoSelect: false,
      warnNote: "Close Edge completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(local, "Microsoft", "Edge", "User Data")],
      paths: [],
      psScan: `$d="$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data";$t=0L;$c=0;if(Test-Path $d){Get-ChildItem $d -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}};Write-Output "$t $c"`,
      psClean: `$d="$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data";$t=0L;if(Test-Path $d){Get-ChildItem $d -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}};Write-Output $t`,
    },
    {
      id: "firefoxprivacy",
      group: "privacy",
      name: "Firefox History & Cookies",
      description: "Firefox browsing history, cookies, and form history — all profiles",
      autoSelect: false,
      warnNote: "Close Firefox completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(roaming, "Mozilla", "Firefox", "Profiles"), path.join(local, "Mozilla", "Firefox", "Profiles")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($base in @("$env:APPDATA\\Mozilla\\Firefox\\Profiles","$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles")){if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('places.sqlite','cookies.sqlite','formhistory.sqlite')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($base in @("$env:APPDATA\\Mozilla\\Firefox\\Profiles","$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles")){if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{$pf=$_.FullName;foreach($f in @('places.sqlite','cookies.sqlite','formhistory.sqlite')){$fp=Join-Path $pf $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}}};Write-Output $t`,
    },
    {
      id: "operagxprivacy",
      group: "privacy",
      name: "Opera GX History & Cookies",
      description: "Opera GX browsing history, cookies, and login data",
      autoSelect: false,
      warnNote: "Close Opera GX completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(roaming, "Opera Software", "Opera GX Stable")],
      paths: [],
      psScan: `$t=0L;$c=0;foreach($d in @("$env:APPDATA\\Opera Software\\Opera GX Stable","$env:LOCALAPPDATA\\Opera Software\\Opera GX Stable")){if(Test-Path $d){foreach($f in @('History','Cookies','Login Data','Visited Links')){$fp=Join-Path $d $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($d in @("$env:APPDATA\\Opera Software\\Opera GX Stable","$env:LOCALAPPDATA\\Opera Software\\Opera GX Stable")){if(Test-Path $d){foreach($f in @('History','Cookies','Login Data','Visited Links')){$fp=Join-Path $d $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}};Write-Output $t`,
    },

    {
      id: "vivaldiPrivacy",
      group: "privacy",
      name: "Vivaldi History & Cookies",
      description: "Vivaldi browsing history, cookies, and login data — all profiles",
      autoSelect: false,
      warnNote: "Close Vivaldi completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(local, "Vivaldi", "User Data")],
      paths: [],
      psScan: `$t=0L;$c=0;$base="$env:LOCALAPPDATA\\Vivaldi\\User Data";if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{foreach($f in @('History','Cookies','Login Data','Visited Links')){$fp=Join-Path $_.FullName $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;$base="$env:LOCALAPPDATA\\Vivaldi\\User Data";if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{foreach($f in @('History','Cookies','Login Data','Visited Links')){$fp=Join-Path $_.FullName $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}};Write-Output $t`,
    },
    {
      id: "braveprivacy",
      group: "privacy",
      name: "Brave History & Cookies",
      description: "Brave browsing history, cookies, and login data — all profiles",
      autoSelect: false,
      warnNote: "Close Brave completely before cleaning. This removes browsing history and cookies — you will be logged out of websites.",
      installCheck: [path.join(local, "BraveSoftware", "Brave-Browser", "User Data")],
      paths: [],
      psScan: `$t=0L;$c=0;$base="$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\User Data";if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $_.FullName $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;$t+=$s;$c++}catch{}}}}};Write-Output "$t $c"`,
      psClean: `$t=0L;$base="$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\User Data";if(Test-Path $base){Get-ChildItem $base -Directory -EA SilentlyContinue|ForEach-Object{foreach($f in @('History','Cookies','Login Data','Visited Links','Top Sites')){$fp=Join-Path $_.FullName $f;if(Test-Path $fp){try{$s=(Get-Item $fp -EA Stop).Length;Remove-Item $fp -Force -EA Stop;$t+=$s}catch{}}}}};Write-Output $t`,
    },

    // ── RECYCLE BIN ────────────────────────────────────────────────────────────
    {
      id: "recycle",
      group: "recycle",
      name: "Recycle Bin",
      description: "Files sitting in the Windows Recycle Bin across all drives — any size",
      paths: [],
    },

    // ── DOWNLOADED FILES ───────────────────────────────────────────────────────
    {
      id: "dl_installers",
      group: "downloads",
      name: "Old Installers",
      description: "Installer & archive files in your Downloads folder (.exe, .msi, .iso, .zip, .rar, .7z)",
      autoSelect: false,
      warnNote: "Review before cleaning — these are files in your personal Downloads folder. Only installer and archive formats are counted.",
      paths: [],
      psScan: `$dl2=Join-Path ([System.Environment]::GetFolderPath('UserProfile')) 'Downloads';$exts=@('.exe','.msi','.iso','.zip','.rar','.7z','.tar','.gz','.cab','.pkg','.appx','.msix');$t=0L;$c=0;if(Test-Path $dl2){Get-ChildItem $dl2 -File -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()}|ForEach-Object{$t+=$_.Length;$c++}};Write-Output "$t $c"`,
      psClean: `$dl2=Join-Path ([System.Environment]::GetFolderPath('UserProfile')) 'Downloads';$exts=@('.exe','.msi','.iso','.zip','.rar','.7z','.tar','.gz','.cab','.pkg','.appx','.msix');$t=0L;if(Test-Path $dl2){Get-ChildItem $dl2 -File -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()}|ForEach-Object{try{$s=$_.Length;Remove-Item $_.FullName -Force -EA Stop;$t+=$s}catch{}}};Write-Output $t`,
    },
    {
      id: "dl_partial",
      group: "downloads",
      name: "Partial Downloads",
      description: "Incomplete or temporary download files (.crdownload, .part, .tmp download files)",
      autoSelect: false,
      warnNote: "These are unfinished downloads. If a download was interrupted, check before deleting.",
      paths: [],
      psScan: `$dl2=Join-Path ([System.Environment]::GetFolderPath('UserProfile')) 'Downloads';$exts=@('.crdownload','.part','.partial','.download','.!ut','.!qb');$t=0L;$c=0;if(Test-Path $dl2){Get-ChildItem $dl2 -File -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()}|ForEach-Object{$t+=$_.Length;$c++}};Write-Output "$t $c"`,
      psClean: `$dl2=Join-Path ([System.Environment]::GetFolderPath('UserProfile')) 'Downloads';$exts=@('.crdownload','.part','.partial','.download','.!ut','.!qb');$t=0L;if(Test-Path $dl2){Get-ChildItem $dl2 -File -EA SilentlyContinue|Where-Object{$exts -contains $_.Extension.ToLower()}|ForEach-Object{try{$s=$_.Length;Remove-Item $_.FullName -Force -EA Stop;$t+=$s}catch{}}};Write-Output $t`,
    },
    {
      id: "dl_winodd",
      group: "downloads",
      name: "Temporary Internet Files",
      description: "Windows Internet Explorer / Edge legacy web cache and compatibility cache files",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @("$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\IE","$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\Low","$env:APPDATA\\Microsoft\\Windows\\IECompatCache","$env:APPDATA\\Microsoft\\Windows\\IECompatUaCache")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @("$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\IE","$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\Low","$env:APPDATA\\Microsoft\\Windows\\IECompatCache","$env:APPDATA\\Microsoft\\Windows\\IECompatUaCache")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Get-ChildItem $p -Force -EA SilentlyContinue|Remove-Item -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },

    // ── BACKUP FILES ───────────────────────────────────────────────────────────
    {
      id: "winold",
      group: "backup",
      name: "Windows.old Folder",
      description: "Previous Windows installation kept after an upgrade — safe to remove after confirming Windows is stable",
      autoSelect: false,
      warnNote: "Deleting Windows.old removes your ability to roll back to the previous Windows version. Only clean if your PC is running well on the new version.",
      paths: [],
      psScan: `$p='C:\\Windows.old';$t=0L;$c=0;if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};$c=($items|Where-Object{-not $_.PSIsContainer}).Count};Write-Output "$t $c"`,
      psClean: `$p='C:\\Windows.old';$t=0L;if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t=[long]$s};takeown /F $p /R /D Y 2>$null|Out-Null;icacls $p /grant Administrators:F /T /C /Q 2>$null|Out-Null;Remove-Item $p -Recurse -Force -EA SilentlyContinue};Write-Output $t`,
    },
    {
      id: "backup_wbadmin",
      group: "backup",
      name: "Windows Backup Files",
      description: "Windows Backup catalog files and WindowsImageBackup folder",
      autoSelect: false,
      warnNote: "Only clean if you have your own backup strategy and no longer need these Windows Backup files.",
      paths: [],
      psScan: `$t=0L;$c=0;foreach($p in @('C:\\WindowsImageBackup',"$env:SYSTEMDRIVE\\WindowsImageBackup")){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @('C:\\WindowsImageBackup',"$env:SYSTEMDRIVE\\WindowsImageBackup")){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};Remove-Item $p -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
    {
      id: "backup_wiebkup",
      group: "backup",
      name: "Old Restore Files",
      description: "Windows error recovery info, old BCD backup files, and leftover setup rollback data",
      paths: [
        "C:\\$WINDOWS.~BT",
        "C:\\$WinREAgent",
        path.join(local, "Microsoft", "Windows", "WinX"),
      ],
      psScan: `$t=0L;$c=0;foreach($p in @('C:\\$WINDOWS.~BT','C:\\$WinREAgent','C:\\$WINDOWS.~WS')){if(Test-Path $p){$items=Get-ChildItem $p -Recurse -Force -EA SilentlyContinue;$s=($items|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};$c+=($items|Where-Object{-not $_.PSIsContainer}).Count}};Write-Output "$t $c"`,
      psClean: `$t=0L;foreach($p in @('C:\\$WINDOWS.~BT','C:\\$WinREAgent','C:\\$WINDOWS.~WS')){if(Test-Path $p){$s=(Get-ChildItem $p -Recurse -Force -EA SilentlyContinue|Measure-Object Length -Sum -EA SilentlyContinue).Sum;if($s){$t+=[long]$s};takeown /F $p /R /D Y 2>$null|Out-Null;Remove-Item $p -Recurse -Force -EA SilentlyContinue}};Write-Output $t`,
    },
  ];
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
$dbgParts = @()
$gpuOnly = @("GPU Core","GPU Hot Spot","GPU VRM","GPU Memory","GPU Memory Junction","GPU Fan","GPU Power","GPU Package")

function Val($s) { try { return [int][math]::Round([double]$s.Value, 0) } catch { return $null } }
function Max($s) { try { return [int][math]::Round([double]$s.Max,  0) } catch { return $null } }

function Read-LhmNs($ns) {
  for ($r = 0; $r -lt 2; $r++) {
    try {
      $s = @(Get-WmiObject -Namespace $ns -Class Sensor -EA Stop | Where-Object { $_.SensorType -eq "Temperature" })
      if ($s.Count -gt 0) { return $s }
    } catch { }
    if ($r -lt 1) { Start-Sleep -Seconds 1 }
  }
  return @()
}

# ── Phase 1: LHM / OHM WMI ────────────────────────────────────────────────
foreach ($ns in @("root/LibreHardwareMonitor","root/OpenHardwareMonitor")) {
  $all = Read-LhmNs $ns
  if ($all.Count -eq 0) { continue }
  $dbgParts += "wmi_ns=" + $ns + "_total=" + $all.Count

  if (-not $gpuTemp) {
    $g = @($all | Where-Object { $_.Name -eq "GPU Core" })
    if ($g.Count -gt 0) { $v = Val $g[0]; if ($v -ge 20 -and $v -lt 120) { $gpuTemp = $v } }
  }
  if (-not $gpuHotspot) {
    $h = @($all | Where-Object { $_.Name -eq "GPU Hot Spot" })
    if ($h.Count -gt 0) { $v = Val $h[0]; if ($v -ge 20 -and $v -lt 130) { $gpuHotspot = $v } }
  }
  if (-not $cpuTemp) {
    $cpuS = @($all | Where-Object { $_.Name -match "CPU|Tdie|Tctl|CCD|Package|Core|Temperature" -and $gpuOnly -notcontains $_.Name })
    if ($cpuS.Count -eq 0) { $cpuS = @($all | Where-Object { $gpuOnly -notcontains $_.Name }) }
    $vals = @($cpuS | ForEach-Object { Val $_ } | Where-Object { $_ -ne $null -and $_ -ge 20 -and $_ -lt 115 })
    if ($vals.Count -gt 0) {
      $cpuTemp = ($vals | Sort-Object -Descending)[0]
      $maxVals = @($cpuS | ForEach-Object { Max $_ } | Where-Object { $_ -ne $null -and $_ -ge 20 -and $_ -lt 115 })
      if ($maxVals.Count -gt 0) { $cpuPeak = ($maxVals | Sort-Object -Descending)[0] }
    }
  }
  if ($cpuTemp -and $gpuTemp) { break }
}

# ── Phase 2: LHM DLL direct load (bypasses WMI entirely — works even if WMI is not registered) ──
if (-not $cpuTemp) {
  $lhmDir2 = [System.IO.Path]::Combine($env:LOCALAPPDATA, "JGoode-AIO", "LibreHardwareMonitor")
  $lhmDll2 = [System.IO.Path]::Combine($lhmDir2, "LibreHardwareMonitorLib.dll")
  if (Test-Path $lhmDll2) {
    try {
      Get-ChildItem $lhmDir2 -Filter "*.dll" -EA SilentlyContinue | ForEach-Object { try { [System.Reflection.Assembly]::LoadFrom($_.FullName) | Out-Null } catch {} }
      $comp2 = New-Object LibreHardwareMonitor.Hardware.Computer
      $comp2.IsCpuEnabled = $true; $comp2.IsMotherboardEnabled = $true; $comp2.IsGpuEnabled = $true
      $comp2.IsStorageEnabled = $false; $comp2.IsControllerEnabled = $false; $comp2.IsNetworkEnabled = $false; $comp2.IsBatteryEnabled = $false
      $comp2.Open()
      $comp2.Hardware | ForEach-Object { $_.Update(); $_.SubHardware | ForEach-Object { $_.Update() } }
      $comp2.Hardware | ForEach-Object {
        $hwT = $_.HardwareType.ToString()
        $_.Sensors | Where-Object { $_.SensorType.ToString() -eq "Temperature" -and $null -ne $_.Value } | ForEach-Object {
          $v2 = [int][math]::Round([double]$_.Value, 0); $n2 = $_.Name
          if ($hwT -match "Cpu" -and -not $cpuTemp -and $v2 -ge 20 -and $v2 -lt 115) { $cpuTemp = $v2 }
          if ($hwT -match "Cpu" -and $n2 -match "Package|Tdie|Tctl" -and $v2 -ge 20 -and $v2 -lt 115) { $cpuTemp = $v2 }
          if (($hwT -match "Gpu" -or $hwT -match "Nvidia") -and -not $gpuTemp -and $n2 -match "Core" -and $v2 -ge 20 -and $v2 -lt 120) { $gpuTemp = $v2 }
          if (($hwT -match "Gpu" -or $hwT -match "Nvidia") -and -not $gpuHotspot -and $n2 -match "Hot" -and $v2 -ge 20 -and $v2 -lt 130) { $gpuHotspot = $v2 }
        }
      }
      try { $comp2.Close() } catch {}
      $dbgParts += "dll_ok_cpu=" + $cpuTemp + "_gpu=" + $gpuTemp
    } catch { $dbgParts += "dll_err=" + ($_.Exception.Message -replace '[^a-zA-Z0-9 _=.]','') }
  } else { $dbgParts += "dll_missing" }
}

# ── Phase 3: Windows Get-Counter (no driver, rough ACPI thermal zones) ────
if (-not $cpuTemp) {
  try {
    $ctr = (Get-Counter '\Thermal Zone Information(*)\High Precision Temperature' -EA Stop).CounterSamples
    $v = @($ctr | Where-Object { $_.CookedValue -gt 0 } | ForEach-Object { [int][math]::Round($_.CookedValue / 10.0 - 273.15, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($v.Count -gt 0) { $cpuTemp = ($v | Sort-Object -Descending)[0]; $dbgParts += "ctr_ok" }
  } catch { $dbgParts += "ctr_err" }
}

# ── Phase 4: MSAcpi thermal zone ────────────────────────────────────────────
if (-not $cpuTemp) {
  try {
    $az = @(Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -EA Stop)
    $v = @($az | ForEach-Object { [int][math]::Round($_.CurrentTemperature / 10.0 - 273.15, 0) } | Where-Object { $_ -ge 25 -and $_ -lt 115 })
    if ($v.Count -gt 0) { $cpuTemp = ($v | Sort-Object -Descending)[0]; $dbgParts += "acpi_ok" }
  } catch { $dbgParts += "acpi_err" }
}

$out = [ordered]@{}
if ($null -ne $cpuTemp) { $out['cpu'] = $cpuTemp }
if ($null -ne $cpuPeak) { $out['cpuPeak'] = $cpuPeak }
if ($null -ne $gpuTemp) { $out['gpu'] = $gpuTemp }
if ($null -ne $gpuHotspot) { $out['gpuHotspot'] = $gpuHotspot }
$out['_dbg'] = $dbgParts -join ";"
$out | ConvertTo-Json -Compress -Depth 1`;

        const output = await runPowerShell(psScript, 18000).catch(() => "");
        try {
          const m = output.trim().match(/\{[\s\S]*\}/);
          if (m) {
            const j = JSON.parse(m[0]);
            if (j._dbg) console.log("[TEMP_DBG]", j._dbg);
            if (isValidCpuTemp(j.cpu)) cpuCurrent = Math.round(j.cpu);
            if (isValidCpuTemp(j.cpuPeak)) cpuMax = Math.round(j.cpuPeak);
            if (isValidGpuTemp(j.gpu)) gpuCurrent = Math.round(j.gpu);
            if (isValidGpuTemp(j.gpuHotspot)) gpuHotspot = Math.round(j.gpuHotspot);
          } else {
            console.log("[TEMP_RAW]", output.slice(0, 400));
          }
        } catch (e: any) {
          console.log("[TEMP_ERR]", e?.message, output?.slice(0, 200));
        }
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
      // Cache for 7 seconds (client polls every 8s)
      tempCache = { data, expiresAt: Date.now() + 7000 };
      return res.json(data);
    } catch {
      return res.json({ cpu: { current: null, max: null }, gpu: { current: null } });
    }
  });

  // ── Temps debug — dumps raw LHM sensors to diagnose CPU detection issues ───
  app.get("/api/system/temps/debug", async (_req, res) => {
    if (process.platform !== "win32") return res.json({ error: "Windows only" });
    const script = `
$d = [ordered]@{}
$lhmDir = "$env:LOCALAPPDATA\\JGoode-AIO\\LibreHardwareMonitor"
$lhmExe = "$lhmDir\\LibreHardwareMonitor.exe"
$d['lhm_exe_exists']   = (Test-Path $lhmExe)
$d['lhm_version_file'] = if (Test-Path "$lhmDir\\version.txt") { [string](Get-Content "$lhmDir\\version.txt" -EA SilentlyContinue) -replace '\\s','' } else { "MISSING" }
$d['lhm_config_exists'] = (Test-Path "$lhmDir\\LibreHardwareMonitor.config")
$d['lhm_config_wmi'] = if (Test-Path "$lhmDir\\LibreHardwareMonitor.config") { [string](Select-String -Path "$lhmDir\\LibreHardwareMonitor.config" -Pattern 'wmiEnabled' -Quiet) } else { "no-config" }
$d['lhm_process_running'] = (@(Get-Process "LibreHardwareMonitor" -EA SilentlyContinue)).Count -gt 0
try {
  $all = @(Get-WmiObject -Namespace "root/LibreHardwareMonitor" -Class Sensor -EA Stop)
  $temps = @($all | Where-Object { $_.SensorType -eq "Temperature" })
  $d['lhm_wmi_total']  = $all.Count
  $d['lhm_wmi_temps']  = $temps.Count
  $d['lhm_sensors']    = @($temps | ForEach-Object { $_.Name + "=" + [math]::Round($_.Value,1) })
} catch { $d['lhm_wmi_error'] = $_.Exception.Message }
try {
  $ctr = (Get-Counter '\Thermal Zone Information(*)\High Precision Temperature' -EA Stop).CounterSamples
  $vals = @($ctr | Where-Object { $_.CookedValue -gt 0 } | ForEach-Object { [math]::Round($_.CookedValue/10.0-273.15,1) })
  $d['thermal_zones'] = $vals
} catch { $d['thermal_zone_error'] = $_.Exception.Message }
try {
  $az = @(Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -EA Stop)
  $d['msacpi_temps'] = @($az | ForEach-Object { [math]::Round($_.CurrentTemperature/10.0-273.15,1) })
} catch { $d['msacpi_error'] = $_.Exception.Message }
$d | ConvertTo-Json -Depth 3 -Compress`;
    const raw = await runPowerShell(script, 12000).catch(() => "{}");
    const m = raw.trim().match(/\{[\s\S]*\}/);
    try { res.json(m ? JSON.parse(m[0]) : { error: "no output", raw }); }
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
      const results = await mapWithConcurrency(
        CLEAN_CATEGORIES,
        5,
        async (cat) => {
          let totalSize = 0;
          let totalCount = 0;

          // Smart detection: check if app/game/browser is actually installed
          let installed = true;
          if (cat.installCheck && cat.installCheck.length > 0) {
            installed = false;
            for (const checkPath of cat.installCheck) {
              try { await fs.promises.access(checkPath); installed = true; break; } catch {}
            }
          }

          if (cat.id === "recycle" && process.platform === "win32") {
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
          } else if (cat.psScan) {
            // Custom PowerShell scan script — outputs "BYTES COUNT"
            const raw = await runPowerShell(cat.psScan, 15000).catch(() => "0 0");
            const parts = raw.trim().split(/\s+/);
            totalSize = Math.max(0, parseInt(parts[0]) || 0);
            totalCount = Math.max(0, parseInt(parts[1]) || 0);
          } else if (cat.globDir && cat.globPattern) {
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
            group: cat.group,
            name: cat.name,
            description: cat.description,
            size: totalSize,
            sizeHuman: fmtSize(totalSize),
            fileCount: totalCount,
            found: totalSize > 0 || totalCount > 0,
            installed,
            autoSelect: cat.autoSelect !== false,
            warnNote: cat.warnNote ?? null,
          };
        }
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

      const isWin = process.platform === "win32";

      async function cleanOne(id: string): Promise<{ freed: number; name: string | null }> {
        const cat = CLEAN_CATEGORIES.find((c) => c.id === id);
        if (!cat) return { freed: 0, name: null };
        let freed = 0;

        if (cat.psClean) {
          // psClean scripts self-manage any required service stops/starts internally
          const result = await runPowerShell(cat.psClean, 30000).catch(() => "0");
          freed += Math.max(0, parseInt(result.trim().split(/\s+/)[0]) || 0);
        } else if (id === "recycle" && isWin) {
          const psRecycleClean = `
try {
  $tot=0L
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
                if ($s -gt 0) { $tot += $s }
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
        } else if (id === "thumbnails" && isWin) {
          const psScript = `
$dir = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
$files = @(Get-ChildItem $dir -Filter 'thumbcache_*.db' -File -EA SilentlyContinue)
$total = ($files | Measure-Object -Property Length -Sum -EA SilentlyContinue).Sum
if (-not $total) { $total = 0 }
if ($files.Count -gt 0) {
    Stop-Process -Name explorer -Force -EA SilentlyContinue
    Start-Sleep -Milliseconds 800
    foreach ($f in $files) { Remove-Item $f.FullName -Force -EA SilentlyContinue }
    Start-Sleep -Milliseconds 300
    Start-Process explorer
}
[string]$total`.trim();
          const result = await runPowerShell(psScript, 12000).catch(() => "0");
          const lines = result.trim().split(/\r?\n/);
          freed += Math.max(0, parseInt(lines[lines.length - 1] || "0") || 0);
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
                    const sz = stat.size;
                    await fs.promises.rm(full, { force: true });
                    try { await fs.promises.access(full); } catch { freed += sz; }
                  }
                } catch {}
              }
            }
          } catch {}
        } else {
          if (cat.subDirScan && cat.subDirScan.length > 0) {
            const expandedPaths = await expandSubDirScan(cat.subDirScan);
            for (const p of expandedPaths) {
              try { await fs.promises.access(p); freed += await deleteContents(p); } catch {}
            }
          }
          for (const p of cat.paths) {
            const expanded = expandPath(p);
            try { await fs.promises.access(expanded); freed += await deleteContents(expanded); } catch {}
          }
        }

        return { freed, name: freed > 0 ? cat.name : null };
      }

      // Explorer-killing categories (thumbnails, iconcache) must run sequentially
      // after all others to avoid simultaneous explorer.exe kill/restart races
      const EXPLORER_KILLERS = new Set(["thumbnails", "iconcache"]);
      const parallelIds  = ids.filter((id) => !EXPLORER_KILLERS.has(id));
      const sequentialIds = ids.filter((id) => EXPLORER_KILLERS.has(id));

      const parallelResults = await mapWithConcurrency(parallelIds, 4, cleanOne);
      const sequentialResults: { freed: number; name: string | null }[] = [];
      for (const id of sequentialIds) sequentialResults.push(await cleanOne(id));

      const allResults  = [...parallelResults, ...sequentialResults];
      const totalFreed  = allResults.reduce((s, r) => s + r.freed, 0);
      const cleaned     = allResults.filter((r) => r.name !== null).map((r) => r.name as string);

      if (totalFreed > 0) {
        await storage.addCleaningHistory({
          date: new Date().toISOString(),
          freed: totalFreed,
          freedHuman: fmtSize(totalFreed),
          count: cleaned.length,
        });
      }

      res.json({ success: true, freed: totalFreed, freedHuman: fmtSize(totalFreed), cleaned });
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

  // ── Debloat: Launch Winaero Tweaker ────────────────────────────────────────
  app.post("/api/debloat/launch-winaero", async (_req, res) => {
    if (process.platform !== "win32")
      return res.json({ success: false, message: "Windows only." });

    const exesDir = process.env.ELECTRON_RESOURCES_PATH
      ? path.join(process.env.ELECTRON_RESOURCES_PATH, "server", "executables")
      : path.join(process.cwd(), "server", "executables");
    const bundledSetup = path.join(exesDir, "WinaeroTweakerSetup.exe");

    const psScript = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      `$installCandidates = @(`,
      `  "$env:ProgramFiles\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "\${env:ProgramFiles(x86)}\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Programs\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:ProgramData\\Winaero Tweaker\\WinaeroTweaker.exe"`,
      `)`,
      `foreach ($rp in @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe')) {`,
      `  if (Test-Path $rp) { $val = (Get-ItemProperty $rp -EA SilentlyContinue).'(default)'; if ($val -and (Test-Path $val)) { $exePath = $val; break } }`,
      `}`,
      `if (-not $exePath) { foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } } }`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall')`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object { (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*Winaero*' } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc 'WinaeroTweaker.exe'; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      `if (-not $exePath) {`,
      `  $setup = '${bundledSetup.replace(/\\/g, "\\\\")}'`,
      `  if (Test-Path $setup) {`,
      `    Start-Process -FilePath $setup -ArgumentList '/SP-', '/VERYSILENT' -Wait`,
      `    Start-Sleep -Seconds 2`,
      `    foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `  }`,
      `}`,
      `if ($exePath) { Start-Process -FilePath $exePath -WindowStyle Normal; Write-Output "OK" } else { Write-Output "NOTFOUND" }`,
    ].join("\r\n");

    try {
      const out = (await runPowerShell(psScript, 40000)).trim();
      if (out === "OK") {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Winaero Tweaker not found and bundled installer unavailable." });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: String(err) });
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
            "reset-winsock","reset-timer-resolution",
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

      const commands: Record<string, { name: string; command: string; description: string; timeout?: number }> = {
        sfc: { name: "System File Checker", command: `powershell -NoProfile -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k','sfc /scannow & echo. & echo ===== SFC Complete ===== & pause'"`, description: "Scans and repairs corrupted Windows system files. Opens an elevated window." },
        dism: { name: "DISM Health Restore", command: `powershell -NoProfile -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/k','DISM /Online /Cleanup-Image /RestoreHealth & echo. & echo ===== DISM Complete ===== & pause'"`, description: "Repairs the Windows image. Requires internet. Can take 10-30 minutes." },
        checkdisk: { name: "Check Disk", command: "chkdsk C: /f /r /x", description: "Checks and repairs disk errors. Schedules for next restart. Requires Administrator." },
        "network-reset": { name: "Full Network Reset", command: `netsh winsock reset
netsh int ip reset
netsh int ipv4 reset
netsh int ipv6 reset
ipconfig /release
ipconfig /flushdns
Write-Output "Network stack fully reset. Please restart your PC to complete the process."`, description: "All network settings reset. Restart required." },
        "flush-dns": { name: "Flush DNS Cache", command: `ipconfig /flushdns
Write-Output "DNS resolver cache flushed."`, description: "DNS cache cleared successfully." },
        "release-ip": { name: "Release IP Address", command: `ipconfig /release 2>&1 | Out-Null
Write-Output "IP address released. Run Renew IP to get a new address."`, description: "IP address released from DHCP." },
        "renew-ip": { name: "Renew IP Address", command: `ipconfig /renew
Write-Output "IP address renewed."`, description: "New IP address obtained from DHCP.", timeout: 60000 },
        "reset-winsock": { name: "Reset Winsock", command: `netsh winsock reset
Write-Output "Winsock catalog reset. Restart your PC to complete the fix."`, description: "Winsock catalog reset. Restart required." },
        "reset-timer-resolution": { name: "Reset Timer Resolution to Default", command: `$ErrorActionPreference = 'SilentlyContinue'
bcdedit /deletevalue useplatformclock 2>&1 | Out-Null
bcdedit /set disabledynamictick no 2>&1 | Out-Null
bcdedit /deletevalue useplatformtick 2>&1 | Out-Null
bcdedit /deletevalue tscsyncpolicy 2>&1 | Out-Null
net stop w32time 2>&1 | Out-Null
w32tm /unregister 2>&1 | Out-Null
w32tm /register 2>&1 | Out-Null
net start w32time 2>&1 | Out-Null
Write-Output "Windows timer resolution has been reset to defaults. Please restart your PC to see the changes take effect."`, description: "Timer resolution reset to Windows defaults. Restart required." },
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
        "clear-shader-cache": { name: "Clear Shader Cache", command: `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand JABsAGEAPQAkAGUAbgB2ADoATABPAEMAQQBMAEEAUABQAEQAQQBUAEEAOwAkAHIAYQA9ACQAZQBuAHYAOgBBAFAAUABEAEEAVABBADsAJABwAGEAdABoAHMAPQBAACgAIgAkAGwAYQBcAE4AVgBJAEQASQBBAFwARABYAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAE4AVgBJAEQASQBBAFwARwBMAEMAYQBjAGgAZQAiACwAIgAkAHIAYQBcAE4AVgBJAEQASQBBAFwAQwBvAG0AcAB1AHQAZQBDAGEAYwBoAGUAIgAsACIAJABsAGEAXABOAFYASQBEAEkAQQAgAEMAbwByAHAAbwByAGEAdABpAG8AbgBcAE4AVgBfAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAEEATQBEAFwARABYAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAEEATQBEAFwAcABjAFwAYwBhAGMAaABlACIALAAiACQAcgBhAFwAQQBNAEQAXABDAE4AXABHAFAAVQBDAGEAYwBoAGUAIgAsACIAJABsAGEAXABEADMARABTAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAEkAbgB0AGUAbABcAFMAaABhAGQAZQByAEMAYQBjAGgAZQAiACwAIgAkAGwAYQBcAE0AaQBjAHIAbwBzAG8AZgB0AFwARABpAHIAZQBjAHQAWAAgAFMAaABhAGQAZQByACAAQwBhAGMAaABlACIAKQA7ACQAYwA9ADAAOwAkAGYAPQAwADsAZgBvAHIAZQBhAGMAaAAoACQAcAAgAGkAbgAgACQAcABhAHQAaABzACkAewBpAGYAKABUAGUAcwB0AC0AUABhAHQAaAAgACQAcAApAHsAJABpAHQAZQBtAHMAPQBHAGUAdAAtAEMAaABpAGwAZABJAHQAZQBtACAAJABwACAALQBSAGUAYwB1AHIAcwBlACAALQBGAG8AcgBjAGUAIAAtAEUAQQAgAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAOwAkAGYAKwA9ACgAJABpAHQAZQBtAHMAfABXAGgAZQByAGUALQBPAGIAagBlAGMAdAB7AC0AbgBvAHQAIAAkAF8ALgBQAFMASQBzAEMAbwBuAHQAYQBpAG4AZQByAH0AKQAuAEMAbwB1AG4AdAA7ACQAaQB0AGUAbQBzAHwAUgBlAG0AbwB2AGUALQBJAHQAZQBtACAALQBGAG8AcgBjAGUAIAAtAFIAZQBjAHUAcgBzAGUAIAAtAEUAQQAgAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAOwAkAGMAKwArAH0AfQA7AFcAcgBpAHQAZQAtAE8AdQB0AHAAdAAgACgAIgBDAGwAZQBhAHIAZQBkACAAIgArACQAZgArACIAIABmAGkAbABlAHMAIABhAGMAcgBvAHMAcwAgACIAKwAkAGMAKwAiACAAbwBmACAAIgArACQAcABhAHQAaABzAC4AQwBvAHUAbgB0ACsAIgAgAHMAaABhAGQAZQByACAAYwBhAGMAaABlACAAbABvAGMAYQB0AGkAbwBuAHMALgAgAEcAUABVACAAcgBlAGIAdQBpAGwAZABzACAAcwBoAGEAZABlAHIAcwAgAG8AbgAgAG4AZQB4AHQAIABnAGEAbQBlACAAbABhAHUAbgBjAGgALgAiACkA`, description: "Cleared NVIDIA (DXCache/GLCache/ComputeCache/NV_Cache), AMD (DXCache/pc/cache/GPUCache), Intel, and DirectX shader caches. GPU rebuilds on next game launch." },
        "rebuild-icon-cache": { name: "Rebuild Icon Cache", command: `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand UwB0AG8AcAAtAFAAcgBvAGMAZQBzAHMAIAAtAE4AYQBtAGUAIABlAHgAcABsAG8AcgBlAHIAIAAtAEYAbwByAGMAZQAgAC0ARQBBACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQA7AFMAdABhAHIAdAAtAFMAbABlAGUAcAAgAC0ATQBpAGwAbABpAHMAZQBjAG8AbgBkAHMAIAA2ADAAMAA7AFIAZQBtAG8AdgBlAC0ASQB0AGUAbQAgACIAJABlAG4AdgA6AEwATwBDAEEATABBAFAAUABEAEEAVABBAFwASQBjAG8AbgBDAGEAYwBoAGUALgBkAGIAIgAgAC0ARgBvAHIAYwBlACAALQBFAEEAIABTAGkAbABlAG4AdABsAHkAQwBvAG4AdABpAG4AdQBlADsAUgBlAG0AbwB2AGUALQBJAHQAZQBtACAAIgAkAGUAbgB2ADoATABPAEMAQQBMAEEAUABQAEQAQQBUAEEAXABNAGkAYwByAG8AcwBvAGYAdABcAFcAaQBuAGQAbwB3AHMAXABFAHgAcABsAG8AcgBlAHIAXABpAGMAbwBuAGMAYQBjAGgAZQAqAC4AZABiACIAIAAtAEYAbwByAGMAZQAgAC0ARQBBACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQA7AFMAdABhAHIAdAAtAFAAcgBvAGMAZQBzAHMAIABlAHgAcABsAG8AcgBlAHIAOwBXAHIAaQB0AGUALQBPAHUAdABwAHUAdAAgACIASQBjAG8AbgAgAGMAYQBjAGgAZQAgAHIAZQBiAHUAaQBsAHQALgAgAEkAYwBvAG4AcwAgAHcAaQBsAGwAIAByAGUAZgByAGUAcwBoACAAbQBvAG0AZQBuAHQAYQByAGkAbAB5AC4AIgA=`, description: "Rebuilt the Windows icon cache. Desktop and Explorer icons will refresh." },
        "dxdiag": { name: "DirectX Diagnostic", command: "dxdiag", description: "Opened DirectX Diagnostic Tool." },
        "amd-software": { name: "AMD Software: Adrenalin Edition", command: String.raw`powershell -NoProfile -WindowStyle Hidden -Command "$f=(Get-ItemProperty 'HKCU:\Software\AMD\CN' -Name InstallDir -EA SilentlyContinue).InstallDir;if(-not $f){$f=(Get-ItemProperty 'HKLM:\SOFTWARE\AMD\CN' -Name InstallDir -EA SilentlyContinue).InstallDir};if($f){$exe=Join-Path $f 'RadeonSoftware.exe';if(Test-Path $exe){Start-Process $exe;exit}};$regs=@('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*');foreach($r in $regs){$e=Get-ItemProperty $r -EA SilentlyContinue|Where-Object{$_.DisplayName -match 'AMD Software'}|Select-Object -First 1;if($e){if($e.InstallLocation){$exe=Get-ChildItem $e.InstallLocation -Filter 'RadeonSoftware.exe' -Recurse -Depth 3 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($exe){Start-Process $exe;exit}};if($e.DisplayIcon){$i=($e.DisplayIcon -split ',')[0].Trim([char]34);if($i -and (Test-Path $i)){Start-Process $i;exit}}}};$drives=Get-PSDrive -PSProvider FileSystem -EA SilentlyContinue|Select-Object -Exp Root;foreach($d in $drives){$exe=Get-ChildItem @($d+'Program Files\AMD',$d+'Program Files (x86)\AMD') -Filter 'RadeonSoftware.exe' -Recurse -Depth 5 -EA SilentlyContinue|Select-Object -First 1 -Exp FullName;if($exe){Start-Process $exe;exit}};Start-Process 'https://www.amd.com/en/support/download/drivers.html'"`, description: "Opens AMD Software: Adrenalin Edition. Registry-first detection across all drives. Falls back to AMD driver download page if not installed." },
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
        "checkdisk",
      ]);
      const PS_ACTIONS = new Set([
        "empty-standby-memory",
        "flush-dns", "release-ip", "renew-ip", "reset-winsock", "network-reset",
        "reset-timer-resolution",
      ]);
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
        const output = await runPowerShell(info.command, info.timeout ?? 20000);
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

  // ── Programs ─────────────────────────────────────────────────────────────
  app.get("/api/programs", async (_req, res) => {
    const isWin = process.platform === "win32";
    if (!isWin) return res.json({ programs: [], total: 0, totalSizeMB: 0 });

    const win32Ps = `$seen=@{};$out=@();$paths=@('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*');$all=Get-ItemProperty $paths -EA SilentlyContinue|Where-Object{$_.DisplayName -and -not $_.SystemComponent -and $_.UninstallString -and $_.DisplayName -notmatch '^(KB\\d|Security Update for|Hotfix for|Update for Windows|Microsoft Visual C\\+\\+ \\d{4}\\s+Redist)'};foreach($p in $all){$key=$p.DisplayName.ToLower().Trim();if($seen[$key]){continue};$seen[$key]=$true;$out+=[PSCustomObject]@{name=$p.DisplayName;version=if($p.DisplayVersion){$p.DisplayVersion}else{'';};publisher=if($p.Publisher){$p.Publisher}else{'';};installDate=if($p.InstallDate){$p.InstallDate}else{'';};sizeMB=if($p.EstimatedSize){[Math]::Round($p.EstimatedSize/1024,1)}else{0};uninstallString=$p.UninstallString;quietUninstall=if($p.QuietUninstallString){$p.QuietUninstallString}else{'';};isMsi=if($p.UninstallString -match '(?i)msiexec'){$true}else{$false};msiGuid=if($p.UninstallString -match '(\\{[0-9A-Fa-f\\-]{36}\\})'){$Matches[1]}else{'';};isAppx=$false;packageFamilyName='';installLocation=if($p.InstallLocation){$p.InstallLocation}else{'';}}};ConvertTo-Json @($out|Sort-Object name) -Compress -Depth 2`;

    const appxPs = `$skipNames=@('Microsoft.UI.Xaml','Microsoft.VCLibs','Microsoft.NET','Microsoft.WindowsAppRuntime','Microsoft.Desktop.VC','Microsoft.WindowsAppSDK','Microsoft.Services.Store','MicrosoftCorporationII.WinAppRuntime','Microsoft.MicrosoftEdge.Stable');$appx=Get-AppxPackage -AllUsers -EA SilentlyContinue|Where-Object{-not $_.IsFramework -and -not $_.IsResourcePackage -and $_.NonRemovable -eq $false -and $_.Name -notin $skipNames -and $_.Name -notmatch 'VCLibs|AppRuntime|DesktopVC|WindowsAppSDK|ServicesStore'};$out=$appx|ForEach-Object{$n=$_.Name -replace '^Microsoft\\.','Microsoft ' -replace '^Windows\\.','Windows ';[PSCustomObject]@{name=$n;version=$_.Version;publisher=if($_.Publisher -match 'CN=([^,]+)'){$Matches[1]}else{'Microsoft'};installDate='';sizeMB=0;uninstallString='';quietUninstall='';isMsi=$false;msiGuid='';isAppx=$true;packageFamilyName=$_.PackageFamilyName;installLocation=if($_.InstallLocation){$_.InstallLocation}else{'';}}};ConvertTo-Json @($out|Where-Object{$_.name}|Sort-Object name) -Compress -Depth 2`;

    try {
      const [win32Raw, appxRaw] = await Promise.all([
        runPowerShell(win32Ps, 25000).catch(() => "[]"),
        runPowerShell(appxPs, 15000).catch(() => "[]"),
      ]);
      let win32: any[] = [];
      let appx: any[] = [];
      try { win32 = JSON.parse(win32Raw.trim()); } catch { win32 = []; }
      try { appx = JSON.parse(appxRaw.trim()); } catch { appx = []; }
      if (!Array.isArray(win32)) win32 = [];
      if (!Array.isArray(appx)) appx = [];
      const programs = [...win32, ...appx].filter(p => p && p.name);
      const totalSizeMB = programs.reduce((s: number, p: any) => s + (p.sizeMB || 0), 0);
      res.json({ programs, total: programs.length, totalSizeMB: Math.round(totalSizeMB) });
    } catch (err: any) {
      res.json({ programs: [], total: 0, totalSizeMB: 0 });
    }
  });

  app.post("/api/programs/uninstall", async (req, res) => {
    const isWin = process.platform === "win32";
    if (!isWin) return res.json({ success: false, error: "Windows only" });
    const { uninstallString, quietUninstall, isMsi, msiGuid, programName, isAppx, packageFamilyName } = req.body as {
      uninstallString: string; quietUninstall: string; isMsi: boolean;
      msiGuid: string; programName: string; isAppx: boolean; packageFamilyName: string;
    };

    if (isAppx && packageFamilyName) {
      try {
        const safeFam = packageFamilyName.replace(/'/g, "''");
        const ps = `Get-AppxPackage -AllUsers | Where-Object{$_.PackageFamilyName -eq '${safeFam}'} | Remove-AppxPackage -AllUsers -EA Stop; Write-Output 'OK'`;
        await runPowerShell(ps, 60000);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err?.message || "AppX uninstall failed" });
      }
      return;
    }

    if (!uninstallString) return res.status(400).json({ error: "Missing uninstall string" });
    let cmd: string;
    if (quietUninstall) {
      cmd = quietUninstall;
    } else if (isMsi && msiGuid) {
      cmd = `msiexec /x ${msiGuid} /qn /norestart`;
    } else {
      cmd = uninstallString;
    }
    try {
      const safeCmd = cmd.replace(/'/g, "''");
      const ps = `Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','${safeCmd}' -Verb RunAs -Wait -EA Stop; Write-Output 'OK'`;
      await runPowerShell(ps, 60000);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Uninstall failed" });
    }
  });

  const STORE_IDS: Record<string, string> = {
    "Microsoft.WindowsCalculator": "9WZDNCRFHVN5",
    "Microsoft.WindowsStore": "9WZDNCRFJBMP",
    "Microsoft.XboxApp": "9MV0B5HZVK9Z",
    "Microsoft.GamingApp": "9MV0B5HZVK9Z",
    "Microsoft.XboxGameOverlay": "9NZKPSTSNW4E",
    "Microsoft.Xbox.TCUI": "9NBLGGH4XVQS",
    "Microsoft.WindowsNotepad": "9MSMLRH6LZF3",
    "Microsoft.Paint": "9PCFS5B6T72H",
    "Microsoft.ScreenSketch": "9MZ95KL8MR0L",
    "Microsoft.WindowsTerminal": "9N0DX20HK701",
    "Microsoft.MicrosoftStickyNotes": "9NBLGGH4QGHW",
    "Microsoft.WindowsCamera": "9WZDNCRFJBH4",
    "Microsoft.ZuneMusic": "9WZDNCRFJ3PT",
    "Microsoft.ZuneVideo": "9WZDNCRFJ3P2",
    "Microsoft.YourPhone": "9NMPJ99VJBWV",
    "Microsoft.People": "9NBLGGH10PG8",
    "Microsoft.MicrosoftOfficeHub": "9WZDNCRD29V9",
    "Microsoft.Todos": "9NBLGGH5R558",
    "Microsoft.BingWeather": "9WZDNCRFJ25S",
    "Microsoft.BingNews": "9WZDNCRFHVFW",
    "Microsoft.GetHelp": "9PKDZBMV1H3T",
    "Microsoft.MicrosoftEdge": "XPFFTQ037JWMHS",
    "Microsoft.OutlookForWindows": "9NRX63209R7B",
    "Microsoft.Clipchamp": "9P1J8S7CCWWT",
    "Microsoft.PowerAutomateDesktop": "9NFTCH6J7FHV",
    "Microsoft.MicrosoftTeams": "XP8BT8DW290MPQ",
  };

  app.post("/api/programs/reinstall", async (req, res) => {
    const isWin = process.platform === "win32";
    if (!isWin) return res.json({ success: false, error: "Windows only" });
    const { isMsi, msiGuid, programName, isAppx, packageFamilyName, installLocation } = req.body as {
      isMsi: boolean; msiGuid: string; programName: string;
      isAppx: boolean; packageFamilyName: string; installLocation: string;
    };

    if (isAppx && packageFamilyName) {
      const packageName = packageFamilyName.split("_")[0];
      const storeId = STORE_IDS[packageName];
      try {
        const safeLoc = (installLocation || "").replace(/'/g, "''");
        const safeFam = packageFamilyName.replace(/'/g, "''");
        let ps: string;
        if (safeLoc) {
          ps = `try { Add-AppxPackage -DisableDevelopmentMode -Register '${safeLoc}\\AppxManifest.xml' -EA Stop; Write-Output 'OK' } catch { try { Add-AppxPackage -RegisterByFamilyName -MainPackage '${safeFam}' -EA Stop; Write-Output 'OK' } catch { Write-Output 'FALLBACK' } }`;
        } else {
          ps = `try { Add-AppxPackage -RegisterByFamilyName -MainPackage '${safeFam}' -EA Stop; Write-Output 'OK' } catch { Write-Output 'FALLBACK' }`;
        }
        const out = await runPowerShell(ps, 30000);
        if (out.includes("OK")) {
          return res.json({ success: true, method: "appx-register" });
        }
      } catch {}
      if (storeId) {
        return res.json({ success: true, method: "store", storeUrl: `ms-windows-store://pdp/?productid=${storeId}` });
      }
      return res.json({ success: true, method: "store", storeUrl: `ms-windows-store://search/?query=${encodeURIComponent(programName)}` });
    }

    if (isMsi && msiGuid) {
      try {
        const safeGuid = msiGuid.replace(/'/g, "''");
        const ps = `Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i','${safeGuid}','REINSTALL=ALL','REINSTALLMODE=vomus' -Verb RunAs -Wait -EA Stop; Write-Output 'OK'`;
        await runPowerShell(ps, 90000);
        res.json({ success: true, method: "msi" });
      } catch (err: any) {
        res.status(500).json({ error: err?.message || "Reinstall failed" });
      }
    } else {
      const query = encodeURIComponent(`download ${programName}`);
      res.json({ success: true, method: "browser", searchUrl: `https://www.google.com/search?q=${query}` });
    }
  });

  // ── Software & Apps: Windows scan ─────────────────────────────────
  app.get("/api/software/win-scan", async (_req, res) => {
    if (process.platform !== "win32") {
      return res.json({ installedApps: [], capabilities: {}, features: {} });
    }
    const script = `
$ErrorActionPreference = 'SilentlyContinue'
$appx = (Get-AppxPackage -AllUsers 2>$null) | Select-Object -ExpandProperty Name
$caps = @{}
try {
  Get-WindowsCapability -Online 2>$null | ForEach-Object {
    $caps[$_.Name] = ($_.State -eq 'Installed')
  }
} catch {}
$feats = @{}
try {
  Get-WindowsOptionalFeature -Online 2>$null | ForEach-Object {
    $feats[$_.FeatureName.ToLower()] = ($_.State -eq 'Enabled')
  }
} catch {}
@{ installedApps = @($appx); capabilities = $caps; features = $feats } | ConvertTo-Json -Depth 4 -Compress
`.trim();
    try {
      const out = await runPowerShell(script, 45000);
      const parsed = JSON.parse(out);
      res.json({
        installedApps: Array.isArray(parsed.installedApps) ? parsed.installedApps : [],
        capabilities: parsed.capabilities || {},
        features: parsed.features || {},
      });
    } catch {
      res.json({ installedApps: [], capabilities: {}, features: {} });
    }
  });

  // ── Software & Apps: External scan (winget list) ───────────────────
  app.get("/api/software/ext-scan", async (_req, res) => {
    if (process.platform !== "win32") return res.json({ wingetOutput: "" });
    try {
      const out = await runCmd("winget list --accept-source-agreements 2>&1", 25000);
      res.json({ wingetOutput: out });
    } catch {
      res.json({ wingetOutput: "" });
    }
  });

  // ── Software & Apps: Windows action (AppX / Capability / Feature) ──
  app.post("/api/software/win-action", async (req, res) => {
    if (process.platform !== "win32") return res.status(400).json({ error: "Windows only" });
    const { type, name, action } = req.body as { type: string; name: string; action: "install" | "uninstall" };
    if (!type || !name || !action) return res.status(400).json({ error: "Missing params" });
    const safeName = (name || "").replace(/'/g, "''");
    let script = "";
    if (type === "appx") {
      if (action === "uninstall") {
        script = `Get-AppxPackage -AllUsers | Where-Object { $_.Name -like '*${safeName}*' } | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue; Write-Output 'OK'`;
      } else {
        script = `try { Add-AppxPackage -RegisterByFamilyName -MainPackage '${safeName}' -EA Stop; Write-Output 'OK' } catch { Get-AppxPackage -AllUsers -Name '${safeName}' | Add-AppxPackage -DisableDevelopmentMode -EA SilentlyContinue; Write-Output 'OK' }`;
      }
    } else if (type === "cap") {
      if (action === "uninstall") {
        script = `Remove-WindowsCapability -Online -Name '${safeName}' -ErrorAction SilentlyContinue; Write-Output 'OK'`;
      } else {
        script = `Add-WindowsCapability -Online -Name '${safeName}' -ErrorAction SilentlyContinue; Write-Output 'OK'`;
      }
    } else if (type === "feat") {
      if (action === "uninstall") {
        script = `Disable-WindowsOptionalFeature -Online -FeatureName '${safeName}' -NoRestart -ErrorAction SilentlyContinue; Write-Output 'OK'`;
      } else {
        script = `Enable-WindowsOptionalFeature -Online -FeatureName '${safeName}' -NoRestart -ErrorAction SilentlyContinue; Write-Output 'OK'`;
      }
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }
    try {
      const out = await runPowerShell(script, 60000);
      res.json({ success: true, output: out });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Action failed" });
    }
  });

  // ── Software & Apps: External action (winget) ──────────────────────
  app.post("/api/software/ext-action", async (req, res) => {
    if (process.platform !== "win32") return res.status(400).json({ error: "Windows only" });
    const { id, action } = req.body as { id: string; action: "install" | "uninstall" };
    if (!id || !action) return res.status(400).json({ error: "Missing params" });
    const safeId = (id || "").replace(/"/g, "");
    let cmd = "";
    if (action === "install") {
      cmd = `winget install --id "${safeId}" --accept-source-agreements --accept-package-agreements --silent 2>&1`;
    } else {
      cmd = `winget uninstall --id "${safeId}" --silent 2>&1`;
    }
    try {
      const out = await runCmd(cmd, 120000);
      res.json({ success: true, output: out });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Action failed" });
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
