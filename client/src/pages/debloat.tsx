import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Shield, Download, Zap, CheckCircle2, AlertTriangle,
  Loader2, PackageX, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    electronAPI?: {
      runScript: (script: string) => Promise<{ success: boolean; code: number }>;
      onScriptOutput: (callback: (data: { type: string; text?: string; code?: number }) => void) => () => void;
    };
  }
}

type LaunchStatus = "idle" | "running" | "launching" | "downloading" | "done" | "error";

function LaunchBtn({
  onClick, disabled, status, label, icon: Icon, testId,
}: {
  onClick: () => void; disabled: boolean; status: LaunchStatus;
  label: string; icon?: React.ElementType; testId: string;
}) {
  const busy = disabled && status !== "done" && status !== "error";
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-9 text-xs font-bold transition-all duration-200 gap-2 relative overflow-hidden",
        status === "done"
          ? "bg-green-500/12 border border-green-500/30 text-green-400 hover:bg-green-500/18"
          : status === "error"
          ? "bg-destructive/12 border border-destructive/30 text-destructive hover:bg-destructive/18"
          : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/0"
      )}
      style={(!busy && status !== "done" && status !== "error") ? {
        boxShadow: "0 0 16px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.3)",
      } : undefined}
      data-testid={testId}
    >
      {busy
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...</>
        : status === "done"
        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
        : status === "error"
        ? <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
        : <>{Icon && <Icon className="h-3.5 w-3.5" />}{label}</>}
    </Button>
  );
}

function DebloatCard({
  icon: Icon, title, tag, description, children,
}: {
  icon: React.ElementType;
  title: string;
  tag: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-xl border border-border/70 bg-card hover:border-primary/35 transition-all duration-200 overflow-hidden group relative h-full"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px hsl(var(--primary) / 0.12), 0 4px 18px rgba(0,0,0,0.4)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)"; }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4 border-b border-border/40 bg-secondary/8 shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
          style={{
            background: "hsl(var(--primary) / 0.1)",
            borderColor: "hsl(var(--primary) / 0.22)",
            boxShadow: "0 0 14px hsl(var(--primary) / 0.12)",
          }}
        >
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-[13.5px] text-foreground tracking-tight leading-tight">{title}</h3>
            <span
              className="text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full border shrink-0"
              style={{ color: "hsl(var(--primary) / 0.85)", background: "hsl(var(--primary) / 0.08)", borderColor: "hsl(var(--primary) / 0.2)" }}
            >
              {tag}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">{description}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 space-y-3">{children}</div>
    </div>
  );
}

function InfoBox({ type, children }: { type: "warn" | "info" | "tip"; children: React.ReactNode }) {
  const styles = {
    warn: { bg: "bg-amber-500/8", border: "border-amber-500/20", icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />, text: "text-amber-400/80" },
    info: { bg: "bg-blue-500/8", border: "border-blue-500/20", icon: <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />, text: "text-blue-400/80" },
    tip:  { bg: "bg-secondary/60", border: "border-border/40", icon: <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />, text: "text-muted-foreground/70" },
  }[type];

  return (
    <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", styles.bg, styles.border)}>
      {styles.icon}
      <p className={cn("text-[10.5px] leading-relaxed", styles.text)}>{children}</p>
    </div>
  );
}

export default function Debloat() {
  const { toast } = useToast();

  const [shutup10Status, setShutup10Status] = useState<LaunchStatus>("idle");
  const [titusStatus, setTitusStatus] = useState<LaunchStatus>("idle");
  const [winaerotStatus, setWinaerotStatus] = useState<LaunchStatus>("idle");

  const launchShutUp10 = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "O&O ShutUp10++ can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setShutup10Status("downloading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# Check registry App Paths`,
      `$regPaths = @(`,
      `  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OOSU10.exe',`,
      `  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OOSU10.exe'`,
      `)`,
      `foreach ($rp in $regPaths) {`,
      `  if (Test-Path $rp) {`,
      `    $val = (Get-ItemProperty $rp -EA SilentlyContinue).'(default)'`,
      `    if ($val -and (Test-Path $val)) { $exePath = $val; break }`,
      `  }`,
      `}`,
      ``,
      `# Check common install directories`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "\${env:ProgramFiles(x86)}\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:LOCALAPPDATA\\Programs\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:LOCALAPPDATA\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:ProgramFiles\\OOSU10\\OOSU10.exe",`,
      `    "\${env:ProgramFiles(x86)}\\OOSU10\\OOSU10.exe"`,
      `  )`,
      `  foreach ($c in $candidates) {`,
      `    if (Test-Path $c) { $exePath = $c; break }`,
      `  }`,
      `}`,
      ``,
      `# Scan uninstall registry for OO ShutUp10`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @(`,
      `    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'`,
      `  )`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object {`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*ShutUp10*' -or`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*OOSU*'`,
      `      } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc "OOSU10.exe"; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `# Check persistent cache`,
      `$cacheDir = Join-Path $env:LOCALAPPDATA "JGoode-AIO\\Tool"`,
      `$cacheDest = Join-Path $cacheDir "OOSU10.exe"`,
      `if (-not $exePath) {`,
      `  if ((Test-Path $cacheDest) -and (Get-Item $cacheDest -EA SilentlyContinue).Length -ge 1048576) { $exePath = $cacheDest }`,
      `}`,
      ``,
      `# Also check legacy Temp cache location`,
      `if (-not $exePath) {`,
      `  $t = Join-Path $env:TEMP "OOSU10.exe"`,
      `  if ((Test-Path $t) -and (Get-Item $t -EA SilentlyContinue).Length -ge 1048576) {`,
      `    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `    Copy-Item $t $cacheDest -Force -EA SilentlyContinue`,
      `    $exePath = $cacheDest`,
      `  }`,
      `}`,
      ``,
      `# Download and cache`,
      `if (-not $exePath) {`,
      `  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`,
      `  [Net.ServicePointManager]::DefaultConnectionLimit = 10`,
      `  if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `  $tmpDest = Join-Path $env:TEMP "OOSU10_dl.exe"`,
      `  if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `  $dlUrl = "https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe"`,
      `  $dlOk = $false`,
      `  try {`,
      `    $bits = Get-Command Start-BitsTransfer -EA Stop`,
      `    & $bits.Name -Source $dlUrl -Destination $tmpDest -Priority Foreground -TransferType Download -EA Stop`,
      `    if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `  } catch {}`,
      `  if (-not $dlOk) {`,
      `    try {`,
      `      if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `      $wc = New-Object System.Net.WebClient`,
      `      $wc.Proxy = [System.Net.GlobalProxySelection]::Empty`,
      `      $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `      $wc.DownloadFile($dlUrl, $tmpDest)`,
      `      if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `    } catch {}`,
      `  }`,
      `  if (-not $dlOk) {`,
      `    try {`,
      `      if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `      Invoke-WebRequest -Uri $dlUrl -OutFile $tmpDest -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -UseBasicParsing -TimeoutSec 90 -EA Stop`,
      `      if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `    } catch {}`,
      `  }`,
      `  if (-not $dlOk) { Write-Error "Download failed — check internet connection"; exit 1 }`,
      `  Move-Item $tmpDest $cacheDest -Force`,
      `  $exePath = $cacheDest`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");

    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setShutup10Status("done");
        toast({ title: "O&O ShutUp10++ launched", description: "The app window should appear momentarily." });
      } else {
        setShutup10Status("error");
        toast({ title: "Launch failed", description: "Could not download or launch ShutUp10++. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setShutup10Status("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setShutup10Status("idle"), 4000);
  };

  const launchTitusTool = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Chris Titus Tech WinUtil can only run from the installed desktop app.", variant: "destructive" });
      return;
    }
    setTitusStatus("running");
    const script = [
      `# Chris Titus Tech WinUtil — encode the command to avoid all quoting issues`,
      `$cmd = 'irm https://christitus.com/win | iex'`,
      `$bytes = [System.Text.Encoding]::Unicode.GetBytes($cmd)`,
      `$encoded = [System.Convert]::ToBase64String($bytes)`,
      `Start-Process powershell.exe -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded -Verb RunAs -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setTitusStatus("done");
        toast({ title: "WinUtil launched", description: "The Chris Titus Tech window should appear. Accept the UAC prompt if asked." });
      } else {
        setTitusStatus("error");
        toast({ title: "Launch failed", description: "Could not launch WinUtil. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setTitusStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setTitusStatus("idle"), 5000);
  };

  const launchWinaerot = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Winaero Tweaker can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setWinaerotStatus("launching");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      `$installCandidates = @(`,
      `  "$env:ProgramFiles\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "\${env:ProgramFiles(x86)}\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Programs\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:ProgramData\\Winaero Tweaker\\WinaeroTweaker.exe"`,
      `)`,
      ``,
      `# 1. Check registry App Paths`,
      `foreach ($rp in @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe')) {`,
      `  if (Test-Path $rp) {`,
      `    $val = (Get-ItemProperty $rp -EA SilentlyContinue).'(default)'`,
      `    if ($val -and (Test-Path $val)) { $exePath = $val; break }`,
      `  }`,
      `}`,
      ``,
      `# 2. Check common install directories`,
      `if (-not $exePath) {`,
      `  foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `# 3. Check uninstall registry`,
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
      ``,
      `# 4. Silent install from bundled setup`,
      `if (-not $exePath -and $env:ELECTRON_RESOURCES_PATH) {`,
      `  $setup = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\WinaeroTweakerSetup.exe'`,
      `  if (Test-Path $setup) {`,
      `    Start-Process -FilePath $setup -ArgumentList '/SP-', '/VERYSILENT' -Wait`,
      `    Start-Sleep -Seconds 2`,
      `    foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `  }`,
      `}`,
      ``,
      `# 5. Download portable copy as last resort`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  $destDir = Join-Path $env:TEMP "WinaeroTweaker"`,
      `  $zip = Join-Path $env:TEMP "WinaeroTweaker.zip"`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `    $wc.DownloadFile("https://winaerotweaker.com/download/winaerotweaker.zip", $zip)`,
      `    if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }`,
      `    Expand-Archive -Path $zip -DestinationPath $destDir -Force`,
      `    $found = Get-ChildItem $destDir -Filter "WinaeroTweaker.exe" -Recurse -EA SilentlyContinue | Select-Object -First 1`,
      `    if ($found) { $exePath = $found.FullName } else { Write-Error "WinaeroTweaker.exe not found after extraction"; exit 1 }`,
      `  } catch { Write-Error "Download failed: $_"; exit 1 }`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setWinaerotStatus("done");
        toast({ title: "Winaero Tweaker launched", description: "The app window should appear momentarily." });
      } else {
        setWinaerotStatus("error");
        toast({ title: "Launch failed", description: "Could not find or launch Winaero Tweaker.", variant: "destructive" });
      }
    } catch {
      setWinaerotStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setWinaerotStatus("idle"), 4000);
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            PC <span className="text-primary">Debloat</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Remove bloatware, harden privacy, and reclaim control of Windows
            <span className="ml-2 text-muted-foreground/40">· 3 professional tools</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/15 bg-primary/6 shrink-0">
          <PackageX className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest font-mono">3 Tools</span>
        </div>
      </div>

      {/* ── What is debloating? banner ───────────────────────────────────────── */}
      <div
        className="relative rounded-xl border border-border/50 bg-card overflow-hidden px-5 py-4"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top left, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.22)",
            }}
          >
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[12px] font-black text-foreground tracking-tight mb-1">What is Debloating?</h2>
            <p className="text-[10.5px] text-muted-foreground/70 leading-relaxed">
              Windows ships with dozens of pre-installed apps, background telemetry services, and privacy-invasive data collection that most users never asked for.
              Debloating removes or disables this overhead — recovering RAM, CPU, and disk I/O — and puts you back in control of what runs on your machine.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tool cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Chris Titus Tech WinUtil ─────────────────────────────────────── */}
        <DebloatCard
          icon={Zap}
          title="Chris Titus Tech WinUtil"
          tag="Open Source"
          description="All-in-one Windows tweaks, debloat & app installer"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            The most popular Windows utility on GitHub. Combines debloat presets, a curated app installer (winget), Windows fixes, and performance tweaks into one clean GUI — no command line required.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["Debloat Presets", "App Installer", "Privacy Fixes", "Performance"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="warn">
              Requires internet. Launches an elevated PowerShell window. Review all changes before applying — especially the debloat presets.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchTitusTool}
              disabled={titusStatus === "running"}
              status={titusStatus}
              label="Launch WinUtil"
              icon={Zap}
              testId="button-launch-christitus"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

        {/* ── O&O ShutUp10++ ───────────────────────────────────────────────── */}
        <DebloatCard
          icon={Shield}
          title="O&O ShutUp10++"
          tag="Free"
          description="Advanced Windows privacy & telemetry control"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            The gold standard for Windows privacy hardening. Over 200 individual toggles covering telemetry, diagnostic data, Microsoft account tracking, app permissions, Cortana, and advertising identifiers — all with per-setting explanations.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["200+ Settings", "Telemetry", "App Permissions", "Advertising"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="warn">
              First launch downloads ~77 MB from O&O Software (one-time only). Cached permanently in AppData — never re-downloaded.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchShutUp10}
              disabled={shutup10Status === "downloading"}
              status={shutup10Status}
              label="Launch ShutUp10++"
              icon={Download}
              testId="button-launch-shutup10"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

        {/* ── Winaero Tweaker ──────────────────────────────────────────────── */}
        <DebloatCard
          icon={Sparkles}
          title="Winaero Tweaker"
          tag="Bundled"
          description="Deep Windows UI & behavior customization"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            Unlocks hundreds of hidden Windows settings unavailable through normal menus. Customize the right-click context menu, disable lock screen ads, tweak taskbar behavior, adjust the boot screen, and much more — all with full undo support.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["Context Menus", "UI Customization", "Boot Screen", "Full Undo"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="tip">
              Bundled with the app — installs silently on first launch. No download needed. Every subsequent launch is instant.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchWinaerot}
              disabled={winaerotStatus === "launching"}
              status={winaerotStatus}
              label="Launch Winaero Tweaker"
              icon={Sparkles}
              testId="button-launch-winaerot"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border/30 bg-secondary/15">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
          These are third-party tools maintained by their respective developers. JGoode's A.I.O PC Tool launchers them on your behalf but is not responsible for their behavior. Always review changes before applying, and create a restore point first if in doubt.
        </p>
      </div>

    </div>
  );
}
