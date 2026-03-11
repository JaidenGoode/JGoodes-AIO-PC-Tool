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
  Globe, MonitorPlay, MemoryStick, Sparkles, Cpu, Power, Activity, Settings2, Gamepad2,
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
  const [winaerotStatus, setWinaerotStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [cortexStatus, setCortexStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [exitlagStatus, setExitlagStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

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
      `# Check Temp cached portable copy`,
      `if (-not $exePath) {`,
      `  $t = Join-Path $env:TEMP "OOSU10.exe"`,
      `  if ((Test-Path $t) -and (Get-Item $t -EA SilentlyContinue).Length -ge 102400) { $exePath = $t }`,
      `}`,
      ``,
      `# Download portable copy as last resort`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  $dest = Join-Path $env:TEMP "OOSU10.exe"`,
      `  if (Test-Path $dest) { Remove-Item $dest -Force -EA SilentlyContinue }`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `    $wc.DownloadFile("https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe", $dest)`,
      `  } catch { Write-Error "Download failed: $_"; exit 1 }`,
      `  if (-not (Test-Path $dest)) { Write-Error "File not found after download"; exit 1 }`,
      `  if ((Get-Item $dest).Length -lt 102400) { Write-Error "File invalid or blocked by antivirus"; exit 1 }`,
      `  $exePath = $dest`,
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
    setWinaerotStatus("downloading");
    // 1. Check App Paths registry (covers per-user and system installs)
    // 2. Check common install directories
    // 3. Check Temp cached copy from previous download
    // 4. Download portable copy as last resort
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# Check registry App Paths (most reliable for installed apps)`,
      `$regPaths = @(`,
      `  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe',`,
      `  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe'`,
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
      `    "$env:ProgramFiles\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `    "\${env:ProgramFiles(x86)}\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `    "$env:LOCALAPPDATA\\Programs\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `    "$env:LOCALAPPDATA\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `    "$env:ProgramData\\Winaero Tweaker\\WinaeroTweaker.exe"`,
      `  )`,
      `  foreach ($c in $candidates) {`,
      `    if (Test-Path $c) { $exePath = $c; break }`,
      `  }`,
      `}`,
      ``,
      `# Check Temp cached copy from a previous portable download`,
      `if (-not $exePath) {`,
      `  $tempExe = Get-ChildItem (Join-Path $env:TEMP "WinaeroTweaker") -Filter "WinaeroTweaker.exe" -Recurse -EA SilentlyContinue | Select-Object -First 1`,
      `  if ($tempExe) { $exePath = $tempExe.FullName }`,
      `}`,
      ``,
      `# Also check entire uninstall registry for the DisplayIcon path`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @(`,
      `    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'`,
      `  )`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object {`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*Winaero*'`,
      `      } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $try2 = Join-Path $loc "WinaeroTweaker.exe"; if (Test-Path $try2) { $exePath = $try2; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `# Download portable copy as last resort`,
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
        toast({ title: "Launch failed", description: result.error || "Could not find or launch Winaero Tweaker.", variant: "destructive" });
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
      if (result.exitCode === 2 || result.output?.includes("razer.com")) {
        setCortexStatus("done");
        toast({ title: "Razer Cortex not found", description: "Opening the download page — install it, then click the button again." });
      } else if (result.success) {
        setCortexStatus("done");
        toast({ title: "Razer Cortex launched", description: "The app window should appear momentarily." });
      } else {
        setCortexStatus("error");
        toast({ title: "Launch failed", description: result.error || "Could not find or launch Razer Cortex.", variant: "destructive" });
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
      if (result.exitCode === 2 || result.output?.includes("exitlag.com")) {
        setExitlagStatus("done");
        toast({ title: "ExitLag not found", description: "Opening the download page — install it, then click the button again." });
      } else if (result.success) {
        setExitlagStatus("done");
        toast({ title: "ExitLag launched", description: "The app window should appear momentarily." });
      } else {
        setExitlagStatus("error");
        toast({ title: "Launch failed", description: result.error || "Could not find or launch ExitLag.", variant: "destructive" });
      }
    } catch {
      setExitlagStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setExitlagStatus("idle"), 4000);
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
          <RunButton action="sfc" label="Run SFC Scan" pending={isPending("sfc")} onRun={run} />
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
                  DISM repairs the Windows image. This requires internet and can take 10–30 minutes.
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
          <p className="text-[10px] text-muted-foreground mb-1">Flushes the Windows standby list via NtSetSystemInformation — instant, silent, no popup. Run before gaming for a clean memory baseline.</p>
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
                <p className="text-[10px] text-amber-400/90 leading-relaxed">First launch downloads ~2MB from O&O's servers — takes 10–30s depending on your connection. Subsequent launches are instant (cached).</p>
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
                Free portable tool by Winaero. Unlocks hidden Windows settings not available through Settings or Group Policy — context menus, boot screen, taskbar behavior, visual tweaks, and much more.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex-1">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">First launch downloads a zip from winaerotweaker.com and extracts it to your Temp folder — takes 10–30s. Subsequent launches are instant (cached).</p>
              </div>
              <div className="mt-auto space-y-1">
                <Button
                  size="sm"
                  onClick={launchWinaerot}
                  disabled={winaerotStatus === "downloading"}
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
                  {winaerotStatus === "downloading" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...</>
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
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3">

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

        {/* Hardware Monitors */}
        <UtilCard icon={Activity} title="Hardware Monitors" description="Launch system monitoring & diagnostics tools" delay={0.28}>
          <RunButton action="hwinfo" label="HWiNFO64" pending={isPending("hwinfo")} onRun={run} />
          <RunButton action="gpuz" label="GPU-Z" pending={isPending("gpuz")} onRun={run} />
          <RunButton action="cpuz" label="CPU-Z" pending={isPending("cpuz")} onRun={run} />
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-secondary/60 border border-border/40 mt-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Launches from your install path. If not installed, opens the download page in your browser.
            </p>
          </div>
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
