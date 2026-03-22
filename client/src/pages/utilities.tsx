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
  Globe, MonitorPlay, MemoryStick, Sparkles, Cpu, Power, Settings2, Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function UtilCard({
  icon: Icon, title, description, children, delay = 0,
}: {
  icon: React.ElementType; title: string; description: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <div className="h-full flex flex-col p-4 rounded-xl border border-border bg-card hover:border-primary/25 transition-all duration-150">
        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-[13px] text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col space-y-2">{children}</div>
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
      className="w-full h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold"
      data-testid={`button-utility-${action}`}
    >
      {pending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
      {pending ? "Running..." : label}
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
      `  if ((Test-Path $cacheDest) -and (Get-Item $cacheDest -EA SilentlyContinue).Length -ge 5242880) { $exePath = $cacheDest }`,
      `}`,
      ``,
      `# Also check legacy Temp cache location`,
      `if (-not $exePath) {`,
      `  $t = Join-Path $env:TEMP "OOSU10.exe"`,
      `  if ((Test-Path $t) -and (Get-Item $t -EA SilentlyContinue).Length -ge 5242880) {`,
      `    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `    Copy-Item $t $cacheDest -Force -EA SilentlyContinue`,
      `    $exePath = $cacheDest`,
      `  }`,
      `}`,
      ``,
      `# Download and cache`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `  $tmpDest = Join-Path $env:TEMP "OOSU10_dl.exe"`,
      `  if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `    $wc.DownloadFile("https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe", $tmpDest)`,
      `  } catch { Write-Error "Download failed: $_"; exit 1 }`,
      `  if (-not (Test-Path $tmpDest)) { Write-Error "File not found after download"; exit 1 }`,
      `  if ((Get-Item $tmpDest).Length -lt 5242880) { Write-Error "File too small — may be blocked by antivirus"; exit 1 }`,
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
      toast({ title: "Desktop app required", description: "Display Driver Uninstaller can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setDduStatus("downloading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$cacheDir = Join-Path $env:LOCALAPPDATA 'JGoode-AIO\\DDU'`,
      `$exePath = $null`,
      ``,
      `# Check common DDU paths`,
      `$candidates = @(`,
      `  "$env:ProgramFiles\\DDU\\Display Driver Uninstaller.exe",`,
      `  "\${env:ProgramFiles(x86)}\\DDU\\Display Driver Uninstaller.exe",`,
      `  "C:\\DDU\\Display Driver Uninstaller.exe",`,
      `  "$env:USERPROFILE\\Desktop\\DDU\\Display Driver Uninstaller.exe"`,
      `)`,
      `foreach ($c in $candidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      ``,
      `# Check cached portable copy`,
      `if (-not $exePath) {`,
      `  $cached = Get-ChildItem $cacheDir -Filter 'Display Driver Uninstaller.exe' -Recurse -EA SilentlyContinue | Where-Object { $_.Length -ge 102400 } | Select-Object -First 1`,
      `  if ($cached) { $exePath = $cached.FullName }`,
      `}`,
      ``,
      `# Download latest DDU from GitHub`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0")`,
      `    $api = $wc.DownloadString("https://api.github.com/repos/Wagnardsoft/display-driver-uninstaller/releases/latest")`,
      `    $asset = ($api | ConvertFrom-Json).assets | Where-Object { $_.name -like '*.exe' -or $_.name -like '*.zip' } | Select-Object -First 1`,
      `    if (-not $asset) { Start-Process "https://www.guru3d.com/files-details/display-driver-uninstaller-download.html"; exit 2 }`,
      `    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `    $dest = Join-Path $cacheDir $asset.name`,
      `    $wc2 = New-Object System.Net.WebClient`,
      `    $wc2.Headers.Add("User-Agent", "Mozilla/5.0")`,
      `    $wc2.DownloadFile($asset.browser_download_url, $dest)`,
      `    if ($dest -like '*.zip') {`,
      `      Expand-Archive -Path $dest -DestinationPath $cacheDir -Force`,
      `      $found = Get-ChildItem $cacheDir -Filter 'Display Driver Uninstaller.exe' -Recurse -EA SilentlyContinue | Select-Object -First 1`,
      `      if ($found) { $exePath = $found.FullName } else { Start-Process "https://www.guru3d.com/files-details/display-driver-uninstaller-download.html"; exit 2 }`,
      `    } else {`,
      `      $exePath = $dest`,
      `    }`,
      `  } catch { Start-Process "https://www.guru3d.com/files-details/display-driver-uninstaller-download.html"; exit 2 }`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.code === 2) {
        setDduStatus("done");
        toast({ title: "DDU download page opened", description: "Download and extract DDU, then click the button again to launch." });
      } else if (result.success) {
        setDduStatus("done");
        toast({ title: "DDU launched", description: "Remember: for a clean uninstall, boot into Safe Mode first." });
      } else {
        setDduStatus("error");
        toast({ title: "Launch failed", description: "Could not find or launch DDU.", variant: "destructive" });
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

  const handleToggle = (key: string, action: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    run(action);
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          System <span className="text-primary">Utilities</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Run as Administrator for full effect</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

        {/* ── ROW 1: Maintenance ──────────────────────────────────────── */}

        <UtilCard icon={HardDrive} title="Disk & Storage" description="Cleanup, check, and optimize your drives" delay={0.04}>
          <RunButton action="disk-cleanup" label="Run Disk Cleanup" pending={isPending("disk-cleanup")} onRun={run} />
          <RunButton action="defrag" label="Open Optimize Drives" pending={isPending("defrag")} onRun={run} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold"
                data-testid="button-utility-checkdisk"
              >
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
                <AlertDialogAction onClick={() => run("checkdisk")} className="bg-primary text-white text-sm">
                  Schedule
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </UtilCard>

        <UtilCard icon={ShieldCheck} title="System File Repair" description="Scan and repair Windows system files" delay={0.06}>
          <p className="text-[10px] text-muted-foreground mb-1">Scans all protected Windows files and replaces corrupt ones with Microsoft-cached copies. Run first when experiencing crashes, missing DLLs, or BSOD errors.</p>
          <RunButton action="sfc" label="Run SFC Scan" pending={isPending("sfc")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Repairs the Windows system image and component store. Use when SFC cannot fix issues. Requires internet — takes 10–30 minutes.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold"
                  data-testid="button-utility-dism"
                >
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
                  <AlertDialogAction onClick={() => run("dism")} className="bg-primary text-white text-sm">
                    Run DISM
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </UtilCard>

        <UtilCard icon={Network} title="Network Tools" description="Reset and repair network settings" delay={0.08}>
          <RunButton action="flush-dns" label="Flush DNS Cache" pending={isPending("flush-dns")} onRun={run} />
          <RunButton action="release-ip" label="Release IP Address" pending={isPending("release-ip")} onRun={run} />
          <RunButton action="renew-ip" label="Renew IP Address" pending={isPending("renew-ip")} onRun={run} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs border-border/60 hover:border-destructive/30 text-muted-foreground hover:text-destructive"
              >
                <AlertTriangle className="h-3 w-3 mr-1.5 text-amber-400" />
                Full Network Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold">Full Network Reset?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  This resets ALL network settings including Winsock and IP stack. A restart may be required.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border hover:bg-secondary text-sm">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => run("network-reset")} className="bg-destructive text-white text-sm">
                  Reset Network
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </UtilCard>

        {/* ── ROW 2: Performance & Hardware ──────────────────────────── */}

        {/* NVIDIA Graphics */}
        <UtilCard icon={MonitorPlay} title="NVIDIA Graphics" description="NVIDIA Control Panel, App & diagnostics" delay={0.10}>
          <RunButton action="nvidia-cp" label="NVIDIA Control Panel" pending={isPending("nvidia-cp")} onRun={run} />
          <RunButton action="nvidia-app" label="NVIDIA App" pending={isPending("nvidia-app")} onRun={run} />
          <RunButton action="dxdiag" label="DirectX Diagnostic (dxdiag)" pending={isPending("dxdiag")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Fixes game stutters from corrupt shader caches. GPU rebuilds on next launch.</p>
            <RunButton action="clear-shader-cache" label="Clear Shader Cache" pending={isPending("clear-shader-cache")} onRun={run} />
          </div>
        </UtilCard>

        {/* AMD Radeon */}
        <UtilCard icon={Cpu} title="AMD Radeon" description="AMD Software: Adrenalin Edition & GPU tools" delay={0.12}>
          <p className="text-[10px] text-muted-foreground mb-1">AMD's all-in-one driver hub for performance tuning, overlay, and game optimization. Opens your installed version or the download page.</p>
          <RunButton action="amd-software" label="AMD Software: Adrenalin" pending={isPending("amd-software")} onRun={run} />
          <RunButton action="dxdiag" label="DirectX Diagnostic (dxdiag)" pending={isPending("dxdiag")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Clears AMD & DirectX shader caches. GPU rebuilds on next game launch.</p>
            <RunButton action="clear-shader-cache" label="Clear Shader Cache" pending={isPending("clear-shader-cache")} onRun={run} />
          </div>
        </UtilCard>

        {/* Memory & Explorer */}
        <UtilCard icon={MemoryStick} title="Memory & Explorer" description="Free RAM and refresh the Windows shell" delay={0.14}>
          <p className="text-[10px] text-muted-foreground mb-1">3-stage RAM clear (same as Mem Reduct): flushes process working sets → writes modified pages to disk → purges standby list. Run before gaming for a clean memory baseline.</p>
          <RunButton action="empty-standby-memory" label="Empty Standby Memory" pending={isPending("empty-standby-memory")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Fixes frozen taskbar, blank icons, or stuck Explorer.</p>
            <RunButton action="restart-explorer" label="Restart Explorer" pending={isPending("restart-explorer")} onRun={run} />
            <div className="mt-1.5">
              <RunButton action="rebuild-icon-cache" label="Rebuild Icon Cache" pending={isPending("rebuild-icon-cache")} onRun={run} />
            </div>
          </div>
        </UtilCard>

        {/* ── ROW 3: Settings ─────────────────────────────────────────── */}

        {/* Quick Toggles */}
        <UtilCard icon={Zap} title="Quick Toggles" description="Flip common Windows settings on or off" delay={0.16}>
          <div className="space-y-3">
            {[
              {
                key: "util_storage_sense", label: "Storage Sense",
                desc: "Auto-cleanup old temp files",
                value: storageSense, setter: setStorageSense,
                onAction: "storage-sense-on", offAction: "storage-sense-off",
              },
              {
                key: "util_fast_startup", label: "Fast Startup",
                desc: "Hybrid boot for quicker starts",
                value: fastStartup, setter: setFastStartup,
                onAction: "fast-startup-on", offAction: "fast-startup-off",
              },
              {
                key: "util_location", label: "Location Services",
                desc: "Allow apps to use your location",
                value: locationServices, setter: setLocationServices,
                onAction: "location-on", offAction: "location-off",
              },
            ].map(({ key, label, desc, value, setter, onAction, offAction }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
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

        {/* Power Plans */}
        <UtilCard icon={Power} title="Power Plans" description="Switch your active power plan" delay={0.18}>
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
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border/50 text-foreground hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <div>
                    <p className={cn("text-[12px] font-semibold", isActive ? "text-primary" : "text-foreground")}>{plan.label}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.desc}</p>
                  </div>
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  ) : isActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="pt-1 border-t border-border/30 mt-1">
            <RunButton action="power-options" label="Open Power Options" pending={isPending("power-options")} onRun={run} />
          </div>
        </UtilCard>

        {/* Windows Update */}
        <UtilCard icon={Globe} title="Windows Update" description="Open and configure Windows Update" delay={0.20}>
          <RunButton action="windows-update" label="Open Windows Update" pending={isPending("windows-update")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">Update policy (Windows Pro only for Security mode)</p>
            <Select
              value={windowsUpdateMode}
              onValueChange={(val) => {
                setWindowsUpdateMode(val);
                localStorage.setItem("util_win_update", val);
                run(val);
              }}
            >
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

        {/* ── ROW 4: Windows & Privacy Tools (full width) ──────────────── */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-3">

          <UtilCard icon={Zap} title="Chris Titus Tech WinUtil" description="All-in-one Windows tweaks & debloat tool" delay={0.22}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Popular open-source utility by Chris Titus Tech. Offers one-click Windows debloat, program installation, system tweaks, and fixes — all in a clean GUI.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">Requires internet access and will launch an elevated PowerShell window. Review changes before applying.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchTitusTool}
                  disabled={titusStatus === "running"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    titusStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : titusStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-christitus"
                >
                  {titusStatus === "running" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Launching WinUtil...</>
                  ) : titusStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                  ) : titusStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Zap className="h-3.5 w-3.5" /> Launch WinUtil</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Shield} title="O&O ShutUp10++" description="Advanced Windows privacy hardening tool" delay={0.23}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free third-party tool by O&O Software. Provides granular control over 200+ Windows privacy settings beyond what this app covers — telemetry, Microsoft accounts, app permissions, diagnostics, and more.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">First launch downloads ~77 MB from O&O's servers (one-time). Cached permanently in AppData — never re-downloaded, survives PC restarts and temp cleaners. Subsequent launches are instant.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchShutUp10}
                  disabled={shutup10Status === "downloading"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    shutup10Status === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : shutup10Status === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-shutup10"
                >
                  {shutup10Status === "downloading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...</>
                  ) : shutup10Status === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                  ) : shutup10Status === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Launch ShutUp10++</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Sparkles} title="Winaero Tweaker" description="Deep Windows UI & behavior customization" delay={0.24}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free tool by Winaero. Unlocks hidden Windows settings not available through Settings or Group Policy — context menus, boot screen, taskbar behavior, visual tweaks, and much more.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40 flex-1">
                <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">Bundled installer — installs silently on first launch with no download. Every launch after that is instant.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchWinaerot}
                  disabled={winaerotStatus === "launching"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    winaerotStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : winaerotStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-winaerot"
                >
                  {winaerotStatus === "launching" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Launching...</>
                  ) : winaerotStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                  ) : winaerotStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Launch Winaero Tweaker</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

        </div>

        {/* ── ROW 4b: Gaming Optimization Tools (full width) ──────────── */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-3">

          <UtilCard icon={Gamepad2} title="Razer Cortex" description="Game booster & FPS optimizer by Razer" delay={0.25}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free game optimizer by Razer. Boosts FPS by suspending background processes while gaming, manages game launches, and includes system-level performance tools — no Razer hardware required.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">If not installed, opens the Razer Cortex download page in your browser. Install it, then click the button again to launch.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchRazerCortex}
                  disabled={cortexStatus === "loading"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    cortexStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : cortexStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-razercortex"
                >
                  {cortexStatus === "loading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</>
                  ) : cortexStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                  ) : cortexStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Launch / Download Razer Cortex</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Zap} title="ExitLag" description="Gaming latency optimizer & connection tool" delay={0.26}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Paid tool that routes your game traffic through optimized servers worldwide to reduce latency, packet loss, and jitter. Works with 700+ games and provides real-time connection graphs.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">If not installed, opens the ExitLag download page in your browser. Install it, then click the button again to launch.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchExitLag}
                  disabled={exitlagStatus === "loading"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    exitlagStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : exitlagStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-exitlag"
                >
                  {exitlagStatus === "loading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</>
                  ) : exitlagStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                  ) : exitlagStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Launch / Download ExitLag</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Cpu} title="MSI Utility v3" description="IRQ & interrupt affinity optimizer for gaming" delay={0.27}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Open-source tool by Sathango. Assigns CPU core affinity to device interrupts (GPU, NIC, audio) — reduces latency spikes and stabilizes frame times in competitive games.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40 flex-1">
                <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">Bundled directly with the app — opens instantly with no download required.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchMsiUtility}
                  disabled={msiStatus === "downloading"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    msiStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : msiStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-msiutility"
                >
                  {msiStatus === "downloading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Launching...</>
                  ) : msiStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                  ) : msiStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Zap className="h-3.5 w-3.5" /> Launch MSI Utility v3</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

        </div>

        {/* ── ROW 4c: Driver Tools + Game Profiles ────────────────────── */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3">

          <UtilCard icon={HardDrive} title="Display Driver Uninstaller (DDU)" description="Fully remove GPU drivers for a clean reinstall" delay={0.28}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The gold standard for GPU driver removal. Strips NVIDIA, AMD, and Intel GPU drivers completely — no leftovers, no conflicts. Use before reinstalling or switching driver versions.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/8 border border-red-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400/90 leading-relaxed">For best results: boot into Safe Mode before running DDU. Do not use in normal Windows — drivers may reinstall mid-removal.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchDDU}
                  disabled={dduStatus === "downloading"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    dduStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : dduStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-ddu"
                >
                  {dduStatus === "downloading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</>
                  ) : dduStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                  ) : dduStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Launch DDU</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Power} title="Power Settings Explorer" description="View and edit all hidden Windows power plan settings" delay={0.30}>
            <div className="flex flex-col flex-1 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Exposes every hidden power setting not shown in the Control Panel — per-plan values, hidden subgroups, GUID references, and defaults. Essential for fine-tuning CPU, GPU, disk, and USB power behaviour.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40 flex-1">
                <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">Bundled — opens instantly with no download required. Works with all power plans including custom and hidden ones.</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchPSE}
                  disabled={pseStatus === "launching"}
                  className={cn(
                    "w-full h-8 text-xs font-bold transition-all gap-1.5",
                    pseStatus === "done"
                      ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : pseStatus === "error"
                      ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/25 hover:border-primary"
                  )}
                  data-testid="button-launch-pse"
                >
                  {pseStatus === "launching" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Launching...</>
                  ) : pseStatus === "done" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                  ) : pseStatus === "error" ? (
                    <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                  ) : (
                    <><Zap className="h-3.5 w-3.5" /> Launch Power Settings Explorer</>
                  )}
                </Button>
                {!window.electronAPI && (
                  <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
                )}
              </div>
            </div>
          </UtilCard>

          <UtilCard icon={Gamepad2} title="Game Profiles" description="Launch tools and download optimized config profiles" delay={0.29}>
            <div className="flex flex-col flex-1 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground">NVIDIA Profile Inspector</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Launch NPI then import your Fortnite profile: File → Import Profile(s) → select the .nip file.</p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={launchNPI}
                    disabled={npiStatus === "launching"}
                    className={cn(
                      "flex-1 h-7 text-xs font-bold transition-all gap-1",
                      npiStatus === "done" ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : npiStatus === "error" ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary"
                    )}
                    data-testid="button-launch-npi"
                  >
                    {npiStatus === "launching" ? <Loader2 className="h-3 w-3 animate-spin" /> : npiStatus === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {npiStatus === "launching" ? "Opening..." : npiStatus === "done" ? "Launched" : "Launch NPI"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadProfile("JsFortniteNPI.nip")}
                    className="flex-1 h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold gap-1"
                    data-testid="button-download-fortnite-npi"
                  >
                    <Download className="h-3 w-3" />
                    .nip Profile
                  </Button>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30 space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground">TCP Optimizer</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Launch TCP Optimizer then load your profile: File → Load Settings → select the .spg file, then Apply Changes.</p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={launchTCPOptimizer}
                    disabled={tcpStatus === "launching"}
                    className={cn(
                      "flex-1 h-7 text-xs font-bold transition-all gap-1",
                      tcpStatus === "done" ? "bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/20"
                      : tcpStatus === "error" ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary"
                    )}
                    data-testid="button-launch-tcp"
                  >
                    {tcpStatus === "launching" ? <Loader2 className="h-3 w-3 animate-spin" /> : tcpStatus === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {tcpStatus === "launching" ? "Opening..." : tcpStatus === "done" ? "Launched" : "Launch TCP"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadProfile("JsTCPOptimizer.spg")}
                    className="flex-1 h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold gap-1"
                    data-testid="button-download-tcp-profile"
                  >
                    <Download className="h-3 w-3" />
                    .spg Profile
                  </Button>
                </div>
              </div>
            </div>
          </UtilCard>

        </div>

        {/* ── ROW 5: Info & Advanced ──────────────────────────────────── */}

        {/* System Info */}
        <UtilCard icon={MapPin} title="System Information" description="Detailed hardware and OS info" delay={0.26}>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs border-border/60 hover:border-primary/30"
            onClick={async () => {
              setShowSystemInfo(!showSystemInfo);
              if (!showSystemInfo && !systemInfo) await fetchSystemInfo();
            }}
            data-testid="button-show-system-info"
          >
            {showSystemInfo ? "Hide Info" : "Show System Info"}
            <ChevronDown className={cn("ml-1.5 h-3 w-3 transition-transform", showSystemInfo && "rotate-180")} />
          </Button>
          {showSystemInfo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 rounded-lg bg-secondary/60 border border-border/40 space-y-1.5">
              {loadingSystemInfo ? (
                <p className="text-[11px] text-muted-foreground">Loading...</p>
              ) : systemInfo ? (
                Object.entries({
                  CPU: systemInfo.cpu?.model,
                  Cores: systemInfo.cpu?.cores,
                  GPU: systemInfo.gpu?.model,
                  VRAM: systemInfo.gpu?.vram,
                  RAM: systemInfo.memory?.total,
                  "RAM Type": systemInfo.memory?.type,
                  OS: systemInfo.system?.os,
                  Disk: systemInfo.storage?.totalSpace,
                }).map(([k, v]) => v && (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium font-mono text-right max-w-[60%] truncate">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">Failed to load system info</p>
              )}
            </motion.div>
          )}
        </UtilCard>

        {/* Windows Admin Tools */}
        <UtilCard icon={Settings2} title="Windows Admin Tools" description="Quick access to system management" delay={0.30}>
          <RunButton action="msconfig" label="System Configuration (msconfig)" pending={isPending("msconfig")} onRun={run} />
          <RunButton action="eventvwr" label="Event Viewer" pending={isPending("eventvwr")} onRun={run} />
          <div className="pt-1 border-t border-border/30">
            <RunButton action="services" label="Services Manager" pending={isPending("services")} onRun={run} />
            <div className="mt-1.5">
              <RunButton action="devmgmt" label="Device Manager" pending={isPending("devmgmt")} onRun={run} />
            </div>
            <div className="mt-1.5">
              <RunButton action="resmon" label="Resource Monitor" pending={isPending("resmon")} onRun={run} />
            </div>
          </div>
        </UtilCard>

      </div>
    </div>
  );
}
