import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { runUtility, getSystemInfo } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  HardDrive, Zap, Network, ShieldCheck,
  AlertTriangle, MapPin, Loader2, ChevronDown, Shield, Download, CheckCircle2,
  Globe, MonitorPlay, MemoryStick, Sparkles, Cpu, Power, Settings2, Gamepad2, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

function UtilCard({
  icon: Icon, title, description, children, delay = 0,
}: {
  icon: React.ElementType; title: string; description: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
      <div
        className="h-full flex flex-col rounded-xl border border-border/70 bg-card hover:border-primary/35 transition-all duration-200 overflow-hidden group relative"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 22px hsl(var(--primary) / 0.1), 0 4px 18px rgba(0,0,0,0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)"; }}
      >
        {/* Gradient top accent strip — matches tweaks card style */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-secondary/8 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.22)",
              boxShadow: "0 0 10px hsl(var(--primary) / 0.1)",
            }}
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[12.5px] text-foreground tracking-tight leading-tight">{title}</h3>
            <p className="text-[9.5px] text-muted-foreground/45 mt-0.5 leading-none truncate">{description}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col space-y-1.5 p-3.5">{children}</div>
      </div>
    </motion.div>
  );
}

function RunButton({ action, label, pending, onRun }: {
  action: string; label: string; pending: boolean; onRun: (a: string) => void;
}) {
  return (
    <Button
      onClick={() => onRun(action)}
      disabled={pending}
      size="sm"
      className={cn(
        "w-full h-7 text-xs font-semibold justify-start gap-2 transition-all duration-150 border",
        pending
          ? "bg-primary/8 border-primary/25 text-primary cursor-not-allowed"
          : "bg-secondary/20 hover:bg-primary/8 text-foreground/60 hover:text-primary border-border/30 hover:border-primary/30"
      )}
      data-testid={`button-utility-${action}`}
    >
      {pending
        ? <Loader2 className="h-2.5 w-2.5 animate-spin text-primary shrink-0" />
        : <div className="h-1.5 w-1.5 rounded-full bg-primary/35 shrink-0" />}
      <span className="truncate">{pending ? "Running..." : label}</span>
    </Button>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-[1px] w-4 bg-primary/50 rounded-full shrink-0" />
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/40 shrink-0 whitespace-nowrap">{title}</span>
      <div className="flex-1 h-[1px] bg-border/30 rounded-full" />
    </div>
  );
}

type LaunchStatus = "idle" | "running" | "launching" | "downloading" | "loading" | "installing" | "done" | "error";
function LaunchBtn({
  onClick, disabled, status, label, icon: Icon, testId,
}: {
  onClick: () => void; disabled: boolean; status: LaunchStatus;
  label: string; icon?: React.ElementType; testId: string;
}) {
  const busy = disabled && status !== "done" && status !== "error";
  return (
    <Button size="sm" onClick={onClick} disabled={disabled}
      className={cn(
        "w-full h-8 text-xs font-bold transition-all duration-200 gap-1.5 relative overflow-hidden",
        status === "done"
          ? "bg-green-500/12 border border-green-500/30 text-green-400 hover:bg-green-500/18"
          : status === "error"
          ? "bg-destructive/12 border border-destructive/30 text-destructive hover:bg-destructive/18"
          : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/0"
      )}
      style={(!busy && status !== "done" && status !== "error") ? {
        boxShadow: "0 0 16px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.3)"
      } : undefined}
      data-testid={testId}>
      {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...</>
        : status === "done" ? <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
        : status === "error" ? <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
        : <>{Icon && <Icon className="h-3.5 w-3.5" />}{label}</>}
    </Button>
  );
}

const PLANS = [
  { id: "balanced", action: "power-balanced", label: "Balanced", desc: "Default — battery & performance" },
  { id: "high", action: "power-high", label: "High Performance", desc: "Max clocks, higher power draw" },
  { id: "ultimate", action: "power-ultimate", label: "Ultimate Performance", desc: "Server-grade, zero throttling" },
] as const;

export default function Utilities() {
  const { toast } = useToast();
  const [storageSense, setStorageSense] = useState(() => localStorage.getItem("util_storage_sense") === "true");
  const [fastStartup, setFastStartup] = useState(() => localStorage.getItem("util_fast_startup") === "true");
  const [locationServices, setLocationServices] = useState(() => localStorage.getItem("util_location") !== "false");
  const [windowsUpdateMode, setWindowsUpdateMode] = useState(() => localStorage.getItem("util_win_update") || "windows-update-default");
  const [activePlan, setActivePlan] = useState<string>(() => localStorage.getItem("util_power_plan") || "");
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [shutup10Status, setShutup10Status] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [titusStatus, setTitusStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [winaerotStatus, setWinaerotStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [cortexStatus, setCortexStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [exitlagStatus, setExitlagStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msiStatus, setMsiStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [dduStatus, setDduStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [npiStatus, setNpiStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [tcpStatus, setTcpStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [pseStatus, setPseStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [runtimeStatus, setRuntimeStatus] = useState<"idle" | "installing" | "done" | "error">("idle");

  const utilityMutation = useMutation({
    mutationFn: (action: string) => runUtility(action) as Promise<{ name: string; description: string; output?: string; message?: string }>,
    onSuccess: (data) => {
      const desc = data.output && data.output !== "Done." && data.output !== "Launched." ? data.output : data.description;
      toast({ title: data.name || "Done", description: desc || data.message || "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: systemInfo, isLoading: loadingSystemInfo, refetch: fetchSystemInfo } = useQuery<any>({
    queryKey: ["/api/system/info"],
    queryFn: getSystemInfo,
    enabled: false,
  });

  const run = (action: string) => utilityMutation.mutate(action);
  const isPending = (action: string) => utilityMutation.isPending && (utilityMutation.variables as string) === action;

  const runPlan = (planId: string, action: string) => {
    setActivePlan(planId);
    localStorage.setItem("util_power_plan", planId);
    run(action);
  };

  const launchShutUp10 = async () => {
    if (!window.electronAPI?.runScript) {
      toast({
        title: "Desktop app required",
        description: "O&O ShutUp10++ can only launch from the installed desktop app.",
        variant: "destructive",
      });
      return;
    }
    setShutup10Status("downloading");
    // 1. Registry App Paths (covers installer-based installs)
    // 2. Common install directories (Program Files, LocalAppData)
    // 3. Uninstall registry scan
    // 4. Temp cached portable download
    // 5. Fresh download as last resort
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
      `# Check persistent cache (survives Temp cleaners)`,
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
      `  # 1st: BITS Transfer — fastest native Windows download method`,
      `  try {`,
      `    $bits = Get-Command Start-BitsTransfer -EA Stop`,
      `    & $bits.Name -Source $dlUrl -Destination $tmpDest -Priority Foreground -TransferType Download -EA Stop`,
      `    if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `  } catch {}`,
      `  # 2nd: WebClient — faster than IWR, no DOM overhead`,
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
      `  # 3rd: Invoke-WebRequest as last resort`,
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
      toast({
        title: "Desktop app required",
        description: "Chris Titus Tech WinUtil can only run from the installed desktop app.",
        variant: "destructive",
      });
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
      toast({
        title: "Desktop app required",
        description: "Winaero Tweaker can only launch from the installed desktop app.",
        variant: "destructive",
      });
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
      `# 1. Check registry App Paths (fastest for already-installed)`,
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
      `# 4. Silent install from bundled setup (no download needed)`,
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

  const launchRazerCortex = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Razer Cortex can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setCortexStatus("loading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# Check registry App Paths`,
      `$regPaths = @(`,
      `  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\RazerCortex.exe',`,
      `  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\RazerCortex.exe'`,
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
      `    "$env:LOCALAPPDATA\\Razer\\RazerCortex\\RazerCortex.exe",`,
      `    "$env:ProgramFiles\\Razer\\Razer Cortex\\RazerCortex.exe",`,
      `    "\${env:ProgramFiles(x86)}\\Razer\\Razer Cortex\\RazerCortex.exe",`,
      `    "$env:ProgramData\\Razer\\RazerCortex\\RazerCortex.exe",`,
      `    "$env:LOCALAPPDATA\\Programs\\Razer\\RazerCortex\\RazerCortex.exe"`,
      `  )`,
      `  foreach ($c in $candidates) {`,
      `    if (Test-Path $c) { $exePath = $c; break }`,
      `  }`,
      `}`,
      ``,
      `# Scan uninstall registry`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @(`,
      `    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'`,
      `  )`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object {`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*Razer Cortex*'`,
      `      } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc "RazerCortex.exe"; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `  exit 0`,
      `} else {`,
      `  Start-Process "https://www.razer.com/cortex"`,
      `  exit 2`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.code === 2) {
        setCortexStatus("done");
        toast({ title: "Razer Cortex not found", description: "Opening the download page — install it, then click the button again." });
      } else if (result.success) {
        setCortexStatus("done");
        toast({ title: "Razer Cortex launched", description: "The app window should appear momentarily." });
      } else {
        setCortexStatus("error");
        toast({ title: "Launch failed", description: "Could not find or launch Razer Cortex.", variant: "destructive" });
      }
    } catch {
      setCortexStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setCortexStatus("idle"), 4000);
  };

  const launchExitLag = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "ExitLag can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setExitlagStatus("loading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# Check registry App Paths`,
      `$regPaths = @(`,
      `  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\ExitLag.exe',`,
      `  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\ExitLag.exe'`,
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
      `    "$env:ProgramFiles\\ExitLag\\ExitLag.exe",`,
      `    "\${env:ProgramFiles(x86)}\\ExitLag\\ExitLag.exe",`,
      `    "$env:LOCALAPPDATA\\Programs\\ExitLag\\ExitLag.exe",`,
      `    "$env:LOCALAPPDATA\\ExitLag\\ExitLag.exe"`,
      `  )`,
      `  foreach ($c in $candidates) {`,
      `    if (Test-Path $c) { $exePath = $c; break }`,
      `  }`,
      `}`,
      ``,
      `# Scan uninstall registry`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @(`,
      `    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'`,
      `  )`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object {`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*ExitLag*'`,
      `      } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc "ExitLag.exe"; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `  exit 0`,
      `} else {`,
      `  Start-Process "https://www.exitlag.com/download"`,
      `  exit 2`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.code === 2) {
        setExitlagStatus("done");
        toast({ title: "ExitLag not found", description: "Opening the download page — install it, then click the button again." });
      } else if (result.success) {
        setExitlagStatus("done");
        toast({ title: "ExitLag launched", description: "The app window should appear momentarily." });
      } else {
        setExitlagStatus("error");
        toast({ title: "Launch failed", description: "Could not find or launch ExitLag.", variant: "destructive" });
      }
    } catch {
      setExitlagStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setExitlagStatus("idle"), 4000);
  };

  const launchMsiUtility = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "MSI Utility v3 can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setMsiStatus("downloading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# 1. Check bundled copy inside the installed app (fastest — no download ever)`,
      `if ($env:ELECTRON_RESOURCES_PATH) {`,
      `  $bundled = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\MsiUtilityV3.exe'`,
      `  if ((Test-Path $bundled) -and (Get-Item $bundled -EA SilentlyContinue).Length -ge 10240) { $exePath = $bundled }`,
      `}`,
      ``,
      `# 2. Check cached copy from a previous download`,
      `if (-not $exePath) {`,
      `  $cacheDir = Join-Path $env:LOCALAPPDATA 'JGoode-AIO\\MsiUtility'`,
      `  $cached = Get-ChildItem $cacheDir -Filter 'MsiUtility*.exe' -Recurse -EA SilentlyContinue | Where-Object { $_.Length -ge 10240 } | Select-Object -First 1`,
      `  if ($cached) { $exePath = $cached.FullName }`,
      `}`,
      ``,
      `# 3. Download latest from GitHub as last resort`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  $cacheDir = Join-Path $env:LOCALAPPDATA 'JGoode-AIO\\MsiUtility'`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0")`,
      `    $api = $wc.DownloadString("https://api.github.com/repos/Sathango/Msi-Utility-v3/releases/latest")`,
      `    $asset = ($api | ConvertFrom-Json).assets | Where-Object { $_.name -like '*.exe' } | Select-Object -First 1`,
      `    if (-not $asset) { Write-Error "No EXE asset found in latest release"; exit 1 }`,
      `    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `    $dest = Join-Path $cacheDir $asset.name`,
      `    $wc2 = New-Object System.Net.WebClient`,
      `    $wc2.Headers.Add("User-Agent", "Mozilla/5.0")`,
      `    $wc2.DownloadFile($asset.browser_download_url, $dest)`,
      `    if ((Get-Item $dest -EA SilentlyContinue).Length -lt 10240) { Write-Error "Download invalid or too small"; exit 1 }`,
      `    $exePath = $dest`,
      `  } catch { Write-Error "Download failed: $_"; exit 1 }`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setMsiStatus("done");
        toast({ title: "MSI Utility v3 launched", description: "The app window should appear momentarily." });
      } else {
        setMsiStatus("error");
        toast({ title: "Launch failed", description: "Could not download or launch MSI Utility v3. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setMsiStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setMsiStatus("idle"), 4000);
  };

  const launchDDU = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "DDU can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setDduStatus("downloading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# 1. Bundled copy inside the installed app`,
      `if ($env:ELECTRON_RESOURCES_PATH) {`,
      `  $bundled = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\DDU.exe'`,
      `  if ((Test-Path $bundled) -and (Get-Item $bundled -EA SilentlyContinue).Length -ge 102400) { $exePath = $bundled }`,
      `}`,
      ``,
      `# 2. Common install/portable locations`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\DDU\\Display Driver Uninstaller.exe",`,
      `    "\${env:ProgramFiles(x86)}\\DDU\\Display Driver Uninstaller.exe",`,
      `    "C:\\DDU\\Display Driver Uninstaller.exe",`,
      `    "$env:USERPROFILE\\Desktop\\DDU\\Display Driver Uninstaller.exe",`,
      `    "$env:LOCALAPPDATA\\JGoode-AIO\\DDU\\Display Driver Uninstaller.exe"`,
      `  )`,
      `  foreach ($c in $candidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `} else {`,
      `  Write-Error "Could not find DDU.exe"; exit 1`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setDduStatus("done");
        toast({ title: "DDU launched", description: "For a clean uninstall, boot into Safe Mode before running DDU." });
      } else {
        setDduStatus("error");
        const openDl = [
          `Start-Process 'https://www.guru3d.com/download/display-driver-uninstaller-download/'`,
        ].join("\r\n");
        await window.electronAPI.runScript(openDl);
        toast({ title: "DDU not found", description: "Opening the DDU download page. Install DDU then click Launch again.", variant: "destructive" });
      }
    } catch {
      setDduStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setDduStatus("idle"), 4000);
  };

  const downloadProfile = (filename: string) => {
    const a = document.createElement("a");
    a.href = `/api/profiles/${filename}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Download started", description: `${filename} is being saved to your Downloads folder.` });
  };

  const launchNPI = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "NVIDIA Profile Inspector can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setNpiStatus("launching");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# 1. Check bundled copy inside the installed app`,
      `if ($env:ELECTRON_RESOURCES_PATH) {`,
      `  $bundled = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\NvidiaProfileInspector.exe'`,
      `  if ((Test-Path $bundled) -and (Get-Item $bundled -EA SilentlyContinue).Length -ge 10240) { $exePath = $bundled }`,
      `}`,
      ``,
      `# 2. Check common install/portable locations`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\NVIDIA Profile Inspector\\nvidiaProfileInspector.exe",`,
      `    "$env:LOCALAPPDATA\\NVIDIA Profile Inspector\\nvidiaProfileInspector.exe",`,
      `    "$env:USERPROFILE\\Downloads\\nvidiaProfileInspector.exe",`,
      `    "$env:USERPROFILE\\Desktop\\nvidiaProfileInspector.exe"`,
      `  )`,
      `  foreach ($c in $candidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `} else {`,
      `  Write-Error "Could not find NvidiaProfileInspector.exe"; exit 1`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setNpiStatus("done");
        toast({ title: "NVIDIA Profile Inspector launched", description: "Import your .nip profile via File → Import Profile(s)." });
      } else {
        setNpiStatus("error");
        toast({ title: "Launch failed", description: "Could not find NVIDIA Profile Inspector.", variant: "destructive" });
      }
    } catch {
      setNpiStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setNpiStatus("idle"), 4000);
  };

  const launchTCPOptimizer = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "TCP Optimizer can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setTcpStatus("launching");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# 1. Check bundled copy inside the installed app`,
      `if ($env:ELECTRON_RESOURCES_PATH) {`,
      `  $bundled = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\TCPOptimizer.exe'`,
      `  if ((Test-Path $bundled) -and (Get-Item $bundled -EA SilentlyContinue).Length -ge 10240) { $exePath = $bundled }`,
      `}`,
      ``,
      `# 2. Check common locations`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\TCP Optimizer\\TCPOptimizer.exe",`,
      `    "$env:USERPROFILE\\Downloads\\TCPOptimizer.exe",`,
      `    "$env:USERPROFILE\\Desktop\\TCPOptimizer.exe",`,
      `    "C:\\TCP Optimizer\\TCPOptimizer.exe"`,
      `  )`,
      `  foreach ($c in $candidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `} else {`,
      `  Write-Error "Could not find TCPOptimizer.exe"; exit 1`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setTcpStatus("done");
        toast({ title: "TCP Optimizer launched", description: "Load your profile via File → Load Settings, then click Apply Changes." });
      } else {
        setTcpStatus("error");
        toast({ title: "Launch failed", description: "Could not find TCP Optimizer.", variant: "destructive" });
      }
    } catch {
      setTcpStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setTcpStatus("idle"), 4000);
  };

  const launchPSE = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Power Settings Explorer can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setPseStatus("launching");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# 1. Check bundled copy inside the installed app`,
      `if ($env:ELECTRON_RESOURCES_PATH) {`,
      `  $bundled = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\PowerSettingsExplorer.exe'`,
      `  if ((Test-Path $bundled) -and (Get-Item $bundled -EA SilentlyContinue).Length -ge 10240) { $exePath = $bundled }`,
      `}`,
      ``,
      `# 2. Check common install/portable locations`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\PowerSettingsExplorer\\PowerSettingsExplorer.exe",`,
      `    "$env:LOCALAPPDATA\\PowerSettingsExplorer\\PowerSettingsExplorer.exe",`,
      `    "$env:USERPROFILE\\Downloads\\PowerSettingsExplorer.exe",`,
      `    "$env:USERPROFILE\\Desktop\\PowerSettingsExplorer.exe"`,
      `  )`,
      `  foreach ($c in $candidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `if ($exePath) {`,
      `  Start-Process -FilePath $exePath -WindowStyle Normal`,
      `} else {`,
      `  Write-Error "Could not find PowerSettingsExplorer.exe"; exit 1`,
      `}`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setPseStatus("done");
        toast({ title: "Power Settings Explorer launched", description: "Browse and edit hidden Windows power plan settings." });
      } else {
        setPseStatus("error");
        toast({ title: "Launch failed", description: "Could not find Power Settings Explorer.", variant: "destructive" });
      }
    } catch {
      setPseStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setPseStatus("idle"), 4000);
  };

  const installGamingRuntimes = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Gaming Runtime Installer can only run from the installed desktop app.", variant: "destructive" });
      return;
    }
    setRuntimeStatus("installing");
    const script = [
      `$inner = @'`,
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`,
      `$Host.UI.RawUI.WindowTitle = "JGoode AIO - Gaming Runtime Installer"`,
      `$errors = 0`,
      `Write-Host ""`,
      `Write-Host "=== JGoode AIO - Gaming Runtime Installer ===" -ForegroundColor Cyan`,
      `Write-Host "Installing all Visual C++ Redistributables and .NET Desktop Runtimes (x64)." -ForegroundColor Gray`,
      `Write-Host "This may take 10-20 minutes. Do NOT close this window." -ForegroundColor Gray`,
      `Write-Host ""`,
      ``,
      `# ── Helper ─────────────────────────────────────────────────────────────────`,
      `function Install-Net($version, $url) {`,
      `  Write-Host "      Downloading .NET $version Desktop Runtime (x64)..." -ForegroundColor Gray`,
      `  $f = Join-Path $env:TEMP "dotnet${version}-desktop-x64.exe"`,
      `  try {`,
      `    $wc.DownloadFile($url, $f)`,
      `    Start-Process -FilePath $f -ArgumentList "/install", "/quiet", "/norestart" -Wait`,
      `    Remove-Item $f -Force -EA SilentlyContinue`,
      `    Write-Host "      .NET $version installed." -ForegroundColor Green`,
      `  } catch {`,
      `    Write-Host "      .NET $version: $($_.Exception.Message)" -ForegroundColor Yellow`,
      `    $script:errors++`,
      `  }`,
      `}`,
      ``,
      `# ── Step 1/4: NuGet provider ───────────────────────────────────────────────`,
      `Write-Host "[1/4] Installing NuGet package provider..." -ForegroundColor Yellow`,
      `try {`,
      `  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope AllUsers | Out-Null`,
      `  Write-Host "      Done." -ForegroundColor Green`,
      `} catch { Write-Host "      NuGet: $($_.Exception.Message)" -ForegroundColor Yellow }`,
      ``,
      `# ── Step 2/4: VcRedist module ──────────────────────────────────────────────`,
      `Write-Host "[2/4] Installing VcRedist PowerShell module..." -ForegroundColor Yellow`,
      `try {`,
      `  if (-not (Get-Module -ListAvailable -Name VcRedist)) {`,
      `    Install-Module -Name VcRedist -Force -SkipPublisherCheck -AllowClobber -Scope AllUsers | Out-Null`,
      `  }`,
      `  Import-Module VcRedist -ErrorAction Stop`,
      `  Write-Host "      Done." -ForegroundColor Green`,
      `} catch { Write-Host "      VcRedist module: $($_.Exception.Message)" -ForegroundColor Yellow; $errors++ }`,
      ``,
      `# ── Step 3/4: Visual C++ Redistributables (2005 through 2022, x86 + x64) ──`,
      `Write-Host "[3/4] Installing Visual C++ Redistributables..." -ForegroundColor Yellow`,
      `Write-Host "      Part A: All versions via VcRedist module (2005-2022, x86+x64)..." -ForegroundColor Gray`,
      `$vcPath = Join-Path $env:TEMP "JGoode-VcRedist"`,
      `if (-not (Test-Path $vcPath)) { New-Item -ItemType Directory -Path $vcPath -Force | Out-Null }`,
      `try {`,
      `  Get-VcList | Save-VcRedist -Path $vcPath | Install-VcRedist -Silent | Out-Null`,
      `  Write-Host "      All VC++ versions installed via VcRedist." -ForegroundColor Green`,
      `} catch { Write-Host "      VcRedist install: $($_.Exception.Message)" -ForegroundColor Yellow; $errors++ }`,
      `try { Remove-Item $vcPath -Recurse -Force -EA SilentlyContinue } catch {}`,
      ``,
      `Write-Host "      Part B: Latest VC++ 2015-2022 direct from Microsoft (x64 + x86)..." -ForegroundColor Gray`,
      `$wc2 = New-Object System.Net.WebClient`,
      `$wc2.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `foreach ($vcPkg in @(`,
      `  @{ name="VC++ 2015-2022 x64"; url="https://aka.ms/vs/17/release/vc_redist.x64.exe"; file="vcredist_2022_x64.exe" },`,
      `  @{ name="VC++ 2015-2022 x86"; url="https://aka.ms/vs/17/release/vc_redist.x86.exe"; file="vcredist_2022_x86.exe" },`,
      `  @{ name="VC++ 2013 x64";      url="https://aka.ms/highdpimfc2013x64enu";             file="vcredist_2013_x64.exe" },`,
      `  @{ name="VC++ 2013 x86";      url="https://aka.ms/highdpimfc2013x86enu";             file="vcredist_2013_x86.exe" }`,
      `)) {`,
      `  $f = Join-Path $env:TEMP $vcPkg.file`,
      `  try {`,
      `    $wc2.DownloadFile($vcPkg.url, $f)`,
      `    Start-Process -FilePath $f -ArgumentList "/install", "/quiet", "/norestart" -Wait`,
      `    Remove-Item $f -Force -EA SilentlyContinue`,
      `    Write-Host "      $($vcPkg.name) installed." -ForegroundColor Green`,
      `  } catch { Write-Host "      $($vcPkg.name): $($_.Exception.Message)" -ForegroundColor Yellow; $errors++ }`,
      `}`,
      ``,
      `# ── Step 4/4: .NET Desktop Runtimes (x64) — 6, 7, 8 LTS, 9, 10 ──────────`,
      `Write-Host "[4/4] Installing .NET Desktop Runtimes (x64)..." -ForegroundColor Yellow`,
      `$wc = New-Object System.Net.WebClient`,
      `$wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `Install-Net "6.0" "https://aka.ms/dotnet/6.0/windowsdesktop-runtime-win-x64.exe"`,
      `Install-Net "7.0" "https://aka.ms/dotnet/7.0/windowsdesktop-runtime-win-x64.exe"`,
      `Install-Net "8.0 (LTS)" "https://aka.ms/dotnet/8.0/windowsdesktop-runtime-win-x64.exe"`,
      `Install-Net "9.0" "https://aka.ms/dotnet/9.0/windowsdesktop-runtime-win-x64.exe"`,
      `Install-Net "10.0" "https://aka.ms/dotnet/10.0/windowsdesktop-runtime-win-x64.exe"`,
      ``,
      `# ── Done ───────────────────────────────────────────────────────────────────`,
      `Write-Host ""`,
      `if ($errors -eq 0) {`,
      `  Write-Host "All gaming runtimes installed successfully!" -ForegroundColor Cyan`,
      `} else {`,
      `  Write-Host "Install complete with $errors warning(s) — see yellow lines above." -ForegroundColor Yellow`,
      `}`,
      `Write-Host "A system restart may be required for changes to take full effect." -ForegroundColor Gray`,
      `Write-Host ""`,
      `Write-Host "Press any key to close this window..."`,
      `$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`,
      `'@`,
      `$tmp = Join-Path $env:TEMP "jgoode-runtime-install.ps1"`,
      `[System.IO.File]::WriteAllText($tmp, $inner, [System.Text.Encoding]::UTF8)`,
      `Start-Process powershell.exe -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $tmp -Verb RunAs`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setRuntimeStatus("done");
        toast({ title: "Runtime installer launched", description: "Installation is running in the admin window. Approve the UAC prompt if asked. Press any key to close when done." });
      } else {
        setRuntimeStatus("error");
        toast({ title: "Launch failed", description: "Could not start the runtime installer. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setRuntimeStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setRuntimeStatus("idle"), 6000);
  };

  const handleToggle = (key: string, action: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    run(action);
  };


  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            System <span className="text-primary">Utilities</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tools, launchers & quick controls
            <span className="ml-2 text-muted-foreground/40">· Run as Administrator for full effect</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/15 bg-primary/6 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest font-mono">Admin Required</span>
        </div>
      </div>

      {/* ── SYSTEM MAINTENANCE ─────────────────────────────────────────────── */}
      <SectionLabel title="System Maintenance" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <UtilCard icon={HardDrive} title="Disk & Storage" description="Cleanup, check, and optimize your drives" delay={0.04}>
          <RunButton action="disk-cleanup" label="Run Disk Cleanup" pending={isPending("disk-cleanup")} onRun={run} />
          <RunButton action="defrag" label="Open Optimize Drives" pending={isPending("defrag")} onRun={run} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="w-full h-7 text-xs font-medium justify-start gap-2 bg-transparent hover:bg-primary/8 text-foreground/70 hover:text-primary border border-border/40 hover:border-primary/25 transition-all duration-150" data-testid="button-utility-checkdisk">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                Schedule Check Disk (C:)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold">Schedule Check Disk?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  chkdsk will run on C: at next restart. This can take several minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => run("checkdisk")} className="bg-primary text-white text-sm">Schedule</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </UtilCard>

        <UtilCard icon={ShieldCheck} title="System File Repair" description="Scan and repair Windows system files" delay={0.06}>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Replaces corrupt protected files with cached Microsoft copies. Run first for crashes, missing DLLs, or BSODs.</p>
          <RunButton action="sfc" label="Run SFC Scan" pending={isPending("sfc")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed mb-1.5">Repairs the Windows image & component store. Use when SFC can't fix issues. Requires internet — 10–30 min.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="w-full h-7 text-xs font-medium justify-start gap-2 bg-transparent hover:bg-primary/8 text-foreground/70 hover:text-primary border border-border/40 hover:border-primary/25 transition-all duration-150" data-testid="button-utility-dism">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                  Run DISM Repair
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-bold">Run DISM Repair?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground">
                    DISM repairs the Windows image and component store. Requires internet — can take 10–30 minutes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run("dism")} className="bg-primary text-white text-sm">Run DISM</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </UtilCard>

        <UtilCard icon={MemoryStick} title="Memory & Explorer" description="Free RAM and refresh the Windows shell" delay={0.08}>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">3-stage RAM flush: working sets → disk pages → standby list. Run before gaming for a clean memory baseline.</p>
          <RunButton action="empty-standby-memory" label="Empty Standby Memory" pending={isPending("empty-standby-memory")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed mb-1.5">Fixes frozen taskbar, blank icons, or stuck Explorer.</p>
            <RunButton action="restart-explorer" label="Restart Explorer" pending={isPending("restart-explorer")} onRun={run} />
            <div className="mt-1.5">
              <RunButton action="rebuild-icon-cache" label="Rebuild Icon Cache" pending={isPending("rebuild-icon-cache")} onRun={run} />
            </div>
          </div>
        </UtilCard>

      </div>

      {/* ── POWER & WINDOWS ─────────────────────────────────────────────────── */}
      <SectionLabel title="Power & Windows" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <UtilCard icon={Zap} title="Quick Toggles" description="Flip common Windows settings on or off" delay={0.10}>
          <div className="space-y-3">
            {[
              { key: "util_storage_sense", label: "Storage Sense", desc: "Auto-cleanup old temp files", value: storageSense, setter: setStorageSense, onAction: "storage-sense-on", offAction: "storage-sense-off" },
              { key: "util_fast_startup", label: "Fast Startup", desc: "Hybrid boot for quicker starts", value: fastStartup, setter: setFastStartup, onAction: "fast-startup-on", offAction: "fast-startup-off" },
              { key: "util_location", label: "Location Services", desc: "Allow apps to use your location", value: locationServices, setter: setLocationServices, onAction: "location-on", offAction: "location-off" },
            ].map(({ key, label, desc, value, setter, onAction, offAction }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(v) => handleToggle(key, v ? onAction : offAction, v, setter)}
                  className="data-[state=checked]:bg-primary shrink-0"
                  data-testid={`switch-${key}`}
                />
              </div>
            ))}
          </div>
        </UtilCard>

        <UtilCard icon={Power} title="Power Plans" description="Switch your active Windows power plan" delay={0.12}>
          <div className="space-y-1.5">
            {PLANS.map((plan) => {
              const isActive = activePlan === plan.id;
              const pending = isPending(plan.action);
              return (
                <button
                  key={plan.id}
                  onClick={() => runPlan(plan.id, plan.action)}
                  disabled={pending}
                  data-testid={`button-power-${plan.id}`}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all duration-150",
                    isActive
                      ? "bg-primary/10 border-primary/35 text-primary"
                      : "bg-secondary/30 border-border/50 text-foreground hover:border-primary/25 hover:bg-primary/5"
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn("text-[12px] font-semibold leading-tight", isActive ? "text-primary" : "text-foreground")}>{plan.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{plan.desc}</p>
                  </div>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                    : isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    : null}
                </button>
              );
            })}
          </div>
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <RunButton action="power-options" label="Open Power Options" pending={isPending("power-options")} onRun={run} />
          </div>
        </UtilCard>

        <UtilCard icon={Globe} title="Windows Update" description="Open and configure Windows Update" delay={0.14}>
          <RunButton action="windows-update" label="Open Windows Update" pending={isPending("windows-update")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <p className="text-[10px] text-muted-foreground/60 mb-1.5">Update policy (Security Only requires Windows Pro)</p>
            <Select value={windowsUpdateMode} onValueChange={(val) => { setWindowsUpdateMode(val); localStorage.setItem("util_win_update", val); run(val); }}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-border/60" data-testid="select-windows-update">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-xs">
                <SelectItem value="windows-update-default">Default — All Updates</SelectItem>
                <SelectItem value="windows-update-security">Security Only (Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </UtilCard>

      </div>

      {/* ── GRAPHICS & DISPLAY ──────────────────────────────────────────────── */}
      <SectionLabel title="Graphics & Display" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        <UtilCard icon={MonitorPlay} title="NVIDIA Graphics" description="Control Panel, NVIDIA App, diagnostics & cache" delay={0.16}>
          <RunButton action="nvidia-cp" label="NVIDIA Control Panel" pending={isPending("nvidia-cp")} onRun={run} />
          <RunButton action="nvidia-app" label="NVIDIA App" pending={isPending("nvidia-app")} onRun={run} />
          <RunButton action="dxdiag" label="DirectX Diagnostic (dxdiag)" pending={isPending("dxdiag")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <p className="text-[10px] text-muted-foreground/60 mb-1.5">Fixes game stutters from corrupt shader caches. GPU rebuilds on next launch.</p>
            <RunButton action="clear-shader-cache" label="Clear Shader Cache" pending={isPending("clear-shader-cache")} onRun={run} />
          </div>
        </UtilCard>

        <UtilCard icon={Cpu} title="AMD Radeon" description="AMD Software: Adrenalin Edition & GPU tools" delay={0.18}>
          <p className="text-[10px] text-muted-foreground/60 mb-1.5">AMD's all-in-one driver hub. Opens your installed version or the download page if not installed.</p>
          <RunButton action="amd-software" label="AMD Software: Adrenalin" pending={isPending("amd-software")} onRun={run} />
          <RunButton action="dxdiag" label="DirectX Diagnostic (dxdiag)" pending={isPending("dxdiag")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <p className="text-[10px] text-muted-foreground/60 mb-1.5">Clears AMD & DirectX shader caches. GPU rebuilds on next game launch.</p>
            <RunButton action="clear-shader-cache" label="Clear Shader Cache" pending={isPending("clear-shader-cache")} onRun={run} />
          </div>
        </UtilCard>

      </div>

      {/* ── NETWORK & ADMIN ─────────────────────────────────────────────────── */}
      <SectionLabel title="Network & Admin" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

        <UtilCard icon={Network} title="Network Tools" description="Run in order from top to bottom to fix connectivity" delay={0.20}>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed -mt-0.5 mb-1">Steps 1-3: safe, run anytime. Step 4: resets Winsock (restart needed). Step 5: nuclear option.</p>
          <RunButton action="flush-dns" label="1. Flush DNS Cache" pending={isPending("flush-dns")} onRun={run} />
          <RunButton action="release-ip" label="2. Release IP Address" pending={isPending("release-ip")} onRun={run} />
          <RunButton action="renew-ip" label="3. Renew IP Address" pending={isPending("renew-ip")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-reset-winsock" className="w-full h-7 text-xs justify-start gap-2 border-border/50 hover:border-amber-500/40 text-muted-foreground/60 hover:text-amber-400 transition-all">
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                  4. Reset Winsock
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-bold">Reset Winsock?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground">
                    Resets the Windows networking catalog (Winsock). A PC restart is required after this to complete the fix.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run("reset-winsock")} className="bg-primary text-white text-sm">Reset Winsock</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="mt-1.5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-network-reset" className="w-full h-7 text-xs justify-start gap-2 border-border/50 hover:border-destructive/40 text-muted-foreground/60 hover:text-destructive transition-all">
                    <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                    5. Full Network Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold">Full Network Reset?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                      Resets ALL network settings — Winsock, IP stack, IPv4, IPv6, and clears DNS. This is the nuclear option. A restart is required to complete it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => run("network-reset")} className="bg-destructive text-white text-sm">Reset Network</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Settings2} title="Windows Admin Tools" description="Quick access to system management panels" delay={0.22}>
          <RunButton action="msconfig" label="System Configuration (msconfig)" pending={isPending("msconfig")} onRun={run} />
          <RunButton action="eventvwr" label="Event Viewer" pending={isPending("eventvwr")} onRun={run} />
          <div className="pt-1.5 border-t border-border/30 mt-0.5">
            <RunButton action="services" label="Services Manager" pending={isPending("services")} onRun={run} />
            <div className="mt-1.5">
              <RunButton action="devmgmt" label="Device Manager" pending={isPending("devmgmt")} onRun={run} />
            </div>
            <div className="mt-1.5">
              <RunButton action="resmon" label="Resource Monitor" pending={isPending("resmon")} onRun={run} />
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Timer} title="Windows Timer Resolution Reset" description="Reset bcdedit timer settings and re-register Windows Time" delay={0.24}>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Removes <span className="font-mono text-[9.5px]">useplatformclock</span>, <span className="font-mono text-[9.5px]">useplatformtick</span>, and <span className="font-mono text-[9.5px]">tscsyncpolicy</span> overrides. Restores <span className="font-mono text-[9.5px]">disabledynamictick</span> to default. Then stops, unregisters, re-registers, and restarts the Windows Time service (w32tm).
          </p>
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 my-1">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400/80 leading-relaxed">A PC restart is required after running this for all changes to take effect.</p>
          </div>
          <div className="mt-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-reset-timer-resolution" className="w-full h-7 text-xs justify-start gap-2 border-border/50 hover:border-primary/40 text-muted-foreground/60 hover:text-foreground transition-all">
                  <Timer className="h-3 w-3 shrink-0" />
                  Reset Timer Resolution to Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-bold">Reset Timer Resolution?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground">
                    This will remove all bcdedit timer overrides and re-register the Windows Time service. Use this if you applied timer tweaks and want to go back to Windows defaults. A restart is required to see the changes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run("reset-timer-resolution")} className="bg-primary text-white text-sm">Reset Timer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </UtilCard>

      </div>

      {/* ── WINDOWS TOOLS ───────────────────────────────────────────────────── */}
      <SectionLabel title="Windows Tools" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <UtilCard icon={Sparkles} title="Chris Titus Tech WinUtil" description="All-in-one Windows tweaks & debloat tool" delay={0.24}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Open-source Windows utility by Chris Titus Tech. One-click debloat, program install, tweaks, and fixes in a clean GUI — no Regedit required.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">Requires internet. Opens an elevated PowerShell window. Review changes before applying.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchTitusTool} disabled={titusStatus === "running"} status={titusStatus} label="Launch WinUtil" icon={Zap} testId="button-launch-christitus" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Shield} title="O&O ShutUp10++" description="Advanced Windows privacy hardening — 200+ settings" delay={0.25}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Free tool by O&O Software. Granular control over telemetry, Microsoft accounts, app permissions, diagnostics, and much more.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">First launch downloads ~77 MB from O&O (one-time). Cached in AppData permanently — never re-downloaded.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchShutUp10} disabled={shutup10Status === "downloading"} status={shutup10Status} label="Launch ShutUp10++" icon={Download} testId="button-launch-shutup10" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Sparkles} title="Winaero Tweaker" description="Deep Windows UI & behavior customization" delay={0.26}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Free tool by Winaero. Unlocks hidden Windows settings — context menus, boot screen, taskbar behavior, visual tweaks, and much more.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40">
              <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">Bundled — installs silently on first launch, no download. Every subsequent launch is instant.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchWinaerot} disabled={winaerotStatus === "launching"} status={winaerotStatus} label="Launch Winaero Tweaker" icon={Download} testId="button-launch-winaerot" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

      </div>

      {/* ── GAMING PERFORMANCE ──────────────────────────────────────────────── */}
      <SectionLabel title="Gaming Performance" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <UtilCard icon={Gamepad2} title="Razer Cortex" description="Game booster & FPS optimizer by Razer" delay={0.27}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Free game optimizer. Boosts FPS by suspending background processes while gaming. No Razer hardware required.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">If not installed, opens the Razer Cortex download page. Install it, then click the button again.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchRazerCortex} disabled={cortexStatus === "loading"} status={cortexStatus} label="Launch / Download Razer Cortex" icon={Download} testId="button-launch-razercortex" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Zap} title="ExitLag" description="Gaming latency optimizer & connection tool" delay={0.28}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Routes game traffic through optimized servers worldwide to reduce latency, packet loss, and jitter. Works with 700+ games.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">If not installed, opens the ExitLag download page. Install it, then click the button again.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchExitLag} disabled={exitlagStatus === "loading"} status={exitlagStatus} label="Launch / Download ExitLag" icon={Download} testId="button-launch-exitlag" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Cpu} title="MSI Utility v3" description="IRQ & interrupt affinity optimizer for gaming" delay={0.29}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Assigns CPU core affinity to device interrupts (GPU, NIC, audio) — reduces latency spikes and stabilizes frame times in competitive games.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40">
              <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">Bundled — opens instantly with no download required.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchMsiUtility} disabled={msiStatus === "downloading"} status={msiStatus} label="Launch MSI Utility v3" icon={Zap} testId="button-launch-msiutility" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

      </div>

      {/* ── PRO TOOLS ───────────────────────────────────────────────────────── */}
      <SectionLabel title="Pro Tools" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <UtilCard icon={HardDrive} title="Display Driver Uninstaller" description="Fully remove GPU drivers for a clean reinstall" delay={0.30}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Gold standard for GPU driver removal. Strips NVIDIA, AMD, and Intel drivers completely — no leftovers or conflicts. Use before switching driver versions.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/8 border border-destructive/20">
              <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
              <p className="text-[10px] text-destructive/80 leading-relaxed">Boot into Safe Mode before running DDU. Drivers may reinstall mid-removal in normal Windows.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchDDU} disabled={dduStatus === "downloading"} status={dduStatus} label="Launch DDU" icon={Zap} testId="button-launch-ddu" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Power} title="Power Settings Explorer" description="View and edit all hidden Windows power plan settings" delay={0.31}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              Exposes every hidden power setting not shown in Control Panel — per-plan values, hidden subgroups, GUID references. Essential for fine-tuning CPU, GPU, disk, and USB power.
            </p>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40">
              <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">Bundled — opens instantly, no download required. Works with all power plans including custom ones.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={launchPSE} disabled={pseStatus === "launching"} status={pseStatus} label="Launch Power Settings Explorer" icon={Zap} testId="button-launch-pse" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

        <UtilCard icon={Gamepad2} title="Game Profiles" description="Launch tools and download optimized config profiles" delay={0.32}>
          <div className="flex flex-col flex-1 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="h-1 w-1 rounded-full bg-primary/60" />
                <p className="text-[11px] font-semibold text-foreground">NVIDIA Profile Inspector</p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Launch NPI then import: File → Import Profile(s) → select the .nip file.</p>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={launchNPI} disabled={npiStatus === "launching"}
                  className={cn("flex-1 h-7 text-xs font-bold transition-all gap-1",
                    npiStatus === "done" ? "bg-green-500/12 border border-green-500/35 text-green-400"
                    : npiStatus === "error" ? "bg-destructive/12 border border-destructive/35 text-destructive"
                    : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20")}
                  data-testid="button-launch-npi">
                  {npiStatus === "launching" ? <Loader2 className="h-3 w-3 animate-spin" /> : npiStatus === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {npiStatus === "launching" ? "Opening..." : npiStatus === "done" ? "Launched" : "Launch NPI"}
                </Button>
                <Button size="sm" onClick={() => downloadProfile("JsFortniteNPI.nip")}
                  className="flex-1 h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold gap-1"
                  data-testid="button-download-fortnite-npi">
                  <Download className="h-3 w-3" />
                  .nip Profile
                </Button>
              </div>
            </div>
            <div className="pt-2 border-t border-border/30 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="h-1 w-1 rounded-full bg-primary/60" />
                <p className="text-[11px] font-semibold text-foreground">TCP Optimizer</p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Launch TCP Optimizer then: File → Load Settings → select the .spg file, then Apply Changes.</p>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={launchTCPOptimizer} disabled={tcpStatus === "launching"}
                  className={cn("flex-1 h-7 text-xs font-bold transition-all gap-1",
                    tcpStatus === "done" ? "bg-green-500/12 border border-green-500/35 text-green-400"
                    : tcpStatus === "error" ? "bg-destructive/12 border border-destructive/35 text-destructive"
                    : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20")}
                  data-testid="button-launch-tcp">
                  {tcpStatus === "launching" ? <Loader2 className="h-3 w-3 animate-spin" /> : tcpStatus === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {tcpStatus === "launching" ? "Opening..." : tcpStatus === "done" ? "Launched" : "Launch TCP"}
                </Button>
                <Button size="sm" onClick={() => downloadProfile("JsTCPOptimizer.spg")}
                  className="flex-1 h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold gap-1"
                  data-testid="button-download-tcp-profile">
                  <Download className="h-3 w-3" />
                  .spg Profile
                </Button>
              </div>
            </div>
          </div>
        </UtilCard>

      </div>

      {/* ── DIAGNOSTICS ─────────────────────────────────────────────────────── */}
      <SectionLabel title="Diagnostics" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        <UtilCard icon={MapPin} title="System Information" description="Detailed hardware and OS info" delay={0.33}>
          <Button size="sm" variant="outline"
            className="w-full h-7 text-xs border-border/60 hover:border-primary/30 text-foreground/70 hover:text-primary transition-all"
            onClick={async () => { setShowSystemInfo(!showSystemInfo); if (!showSystemInfo && !systemInfo) await fetchSystemInfo(); }}
            data-testid="button-show-system-info">
            {showSystemInfo ? "Hide System Info" : "Show System Info"}
            <ChevronDown className={cn("ml-auto h-3 w-3 transition-transform duration-200", showSystemInfo && "rotate-180")} />
          </Button>
          {showSystemInfo && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 p-3 rounded-lg bg-secondary/40 border border-border/40 space-y-1.5">
              {loadingSystemInfo ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</div>
              ) : systemInfo ? (
                Object.entries({
                  CPU: systemInfo.cpu?.model, Cores: systemInfo.cpu?.cores,
                  GPU: systemInfo.gpu?.model, VRAM: systemInfo.gpu?.vram,
                  RAM: systemInfo.memory?.total, "RAM Type": systemInfo.memory?.type,
                  OS: systemInfo.system?.os, Disk: systemInfo.storage?.totalSpace,
                }).map(([k, v]) => v && (
                  <div key={k} className="flex justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground/60 shrink-0">{k}</span>
                    <span className="text-foreground font-medium font-mono text-right truncate">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground/60">Failed to load system info</p>
              )}
            </motion.div>
          )}
        </UtilCard>

        <UtilCard icon={Download} title="Gaming Runtime Installer" description="Install .NET and Visual C++ runtimes for gaming" delay={0.34}>
          <div className="flex flex-col flex-1 space-y-2">
            <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed">
              One-click install of every runtime required to run modern and legacy PC games — DirectX, Visual C++ (2005–2022), and .NET Runtimes (6, 7, 8, 9, 10).
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md border border-border/40 bg-secondary/20 p-2 space-y-0.5">
                <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">Visual C++</p>
                {["2005 · 2008 · 2010", "2012 · 2013", "2015 – 2022 (x86+x64)"].map(v => (
                  <div key={v} className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/70">{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-border/40 bg-secondary/20 p-2 space-y-0.5">
                <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wide mb-1">.NET Desktop</p>
                {["6.0", "7.0", "8.0 (LTS)", "9.0", "10.0"].map(v => (
                  <div key={v} className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/70">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">Opens an elevated installer window. Requires internet. Approve the UAC prompt when asked.</p>
            </div>
            <div className="mt-auto">
              <LaunchBtn onClick={installGamingRuntimes} disabled={runtimeStatus === "installing"} status={runtimeStatus} label="Install All Runtimes" icon={Download} testId="button-install-runtimes" />
              {!window.electronAPI && <p className="text-[10px] text-muted-foreground/40 text-center mt-1">Requires the desktop .exe app</p>}
            </div>
          </div>
        </UtilCard>

      </div>
    </div>
  );
}
