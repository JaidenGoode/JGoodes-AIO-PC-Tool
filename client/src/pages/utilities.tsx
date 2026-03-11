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
  HardDrive, Cpu, Zap, RefreshCw, Network, ShieldCheck,
  AlertTriangle, MapPin, Loader2, ChevronDown, Shield, Download, CheckCircle2,
  Globe, MonitorPlay, Layers, MemoryStick, Sparkles,
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
      <div className="h-full p-4 rounded-xl border border-border bg-card hover:border-primary/25 transition-all duration-150">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-[13px] text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="space-y-2">{children}</div>
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

export default function Utilities() {
  const { toast } = useToast();
  const [storageSense, setStorageSense] = useState(() => localStorage.getItem("util_storage_sense") === "true");
  const [fastStartup, setFastStartup] = useState(() => localStorage.getItem("util_fast_startup") === "true");
  const [locationServices, setLocationServices] = useState(() => localStorage.getItem("util_location") !== "false");
  const [windowsUpdateMode, setWindowsUpdateMode] = useState(() => localStorage.getItem("util_win_update") || "windows-update-default");
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [shutup10Status, setShutup10Status] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [titusStatus, setTitusStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  const utilityMutation = useMutation({
    mutationFn: (action: string) => runUtility(action) as Promise<{ name: string; description: string; output?: string; message?: string }>,
    onSuccess: (data) => {
      const desc = data.output && data.output !== "Done." ? data.output : data.description;
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
    const script = [
      `$ErrorActionPreference = 'Stop'`,
      `$dest = Join-Path $env:TEMP "OOSU10.exe"`,
      `if (-not (Test-Path $dest)) {`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0")`,
      `    $wc.DownloadFile("https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe", $dest)`,
      `  } catch {`,
      `    Write-Error "Download failed: $_"`,
      `    exit 1`,
      `  }`,
      `}`,
      `if (-not (Test-Path $dest)) { Write-Error "File not found after download"; exit 1 }`,
      `Start-Process -FilePath $dest -WindowStyle Normal`,
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

        {/* Disk Cleanup */}
        <UtilCard icon={HardDrive} title="Disk Cleanup" description="Remove temporary files and free space" delay={0.04}>
          <RunButton action="disk-cleanup" label="Run Disk Cleanup" pending={isPending("disk-cleanup")} onRun={run} />
        </UtilCard>

        {/* SFC / DISM */}
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
                  DISM repairs the Windows image. This requires internet and can take 10-30 minutes.
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

        {/* Network Tools */}
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

        {/* Shell & Desktop Fixes */}
        <UtilCard icon={RefreshCw} title="Shell & Desktop Fixes" description="Fix taskbar, desktop icons, and Explorer" delay={0.10}>
          <RunButton action="restart-explorer" label="Restart Explorer" pending={isPending("restart-explorer")} onRun={run} />
          <RunButton action="rebuild-icon-cache" label="Rebuild Icon Cache" pending={isPending("rebuild-icon-cache")} onRun={run} />
        </UtilCard>

        {/* Check Disk */}
        <UtilCard icon={Cpu} title="Check Disk" description="Scan drive C: for errors on next restart" delay={0.12}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all font-semibold"
                data-testid="button-utility-checkdisk"
              >
                Schedule Check Disk
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

        {/* Optimize & Defrag */}
        <UtilCard icon={Layers} title="Optimize Drives" description="Defragment HDDs or TRIM/optimize SSDs" delay={0.13}>
          <RunButton action="defrag" label="Open Optimize Drives" pending={isPending("defrag")} onRun={run} />
        </UtilCard>

        {/* Graphics & Display */}
        <UtilCard icon={MonitorPlay} title="Graphics & Display" description="NVIDIA tools and DirectX diagnostics" delay={0.135}>
          <RunButton action="nvidia-cp" label="NVIDIA Control Panel" pending={isPending("nvidia-cp")} onRun={run} />
          <RunButton action="nvidia-app" label="NVIDIA App" pending={isPending("nvidia-app")} onRun={run} />
          <RunButton action="dxdiag" label="DirectX Diagnostic (dxdiag)" pending={isPending("dxdiag")} onRun={run} />
        </UtilCard>

        {/* Clear Shader Cache */}
        <UtilCard icon={Sparkles} title="Clear Shader Cache" description="Flush NVIDIA, AMD, and DirectX shader caches" delay={0.138}>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fixes game stutters, black screens, and crashes caused by corrupt shader caches. Your GPU rebuilds them on the next game launch — performance may dip briefly on first run.
          </p>
          <RunButton action="clear-shader-cache" label="Clear Shader Cache" pending={isPending("clear-shader-cache")} onRun={run} />
        </UtilCard>

        {/* Windows Update */}
        <UtilCard icon={Globe} title="Windows Update" description="Open Windows Update settings directly" delay={0.14}>
          <RunButton action="windows-update" label="Open Windows Update" pending={isPending("windows-update")} onRun={run} />
        </UtilCard>

        {/* Empty Standby Memory */}
        <UtilCard icon={MemoryStick} title="Empty Standby Memory" description="Flush the Windows standby memory list to instantly free cached RAM before gaming" delay={0.145}>
          <RunButton action="empty-standby-memory" label="Empty Standby Memory" pending={isPending("empty-standby-memory")} onRun={run} />
        </UtilCard>

        {/* Toggles */}
        <UtilCard icon={Zap} title="System Toggles" description="Quick-switch common Windows settings" delay={0.14}>
          <div className="space-y-3">
            {[
              {
                key: "util_storage_sense", label: "Storage Sense",
                desc: "Auto-cleanup old files",
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
                desc: "Apps can use your location",
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

        {/* Windows Update Mode */}
        <UtilCard icon={Network} title="Windows Update Mode" description="Control how Windows installs updates" delay={0.16}>
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
        </UtilCard>

        {/* CTT WinUtil + O&O ShutUp10++ — always side by side */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Chris Titus Tech WinUtil — LEFT */}
          <UtilCard icon={Zap} title="Chris Titus Tech WinUtil" description="All-in-one Windows tweaks & debloat tool" delay={0.19}>
            <div className="space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Popular open-source utility by Chris Titus Tech. Offers one-click Windows debloat, program installation, system tweaks, and fixes — all in a clean GUI.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">Requires internet access and will launch an elevated PowerShell window. Review changes before applying.</p>
              </div>
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
          </UtilCard>

          {/* O&O ShutUp10++ — RIGHT */}
          <UtilCard icon={Shield} title="O&O ShutUp10++" description="Advanced Windows privacy hardening tool" delay={0.20}>
            <div className="space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Free third-party tool by O&O Software. Provides granular control over 200+ Windows privacy settings beyond what this app covers — telemetry, Microsoft accounts, app permissions, diagnostics, and more.
              </p>
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400/90 leading-relaxed">First launch downloads ~2MB from O&O's servers — takes 10–30s depending on your connection. Subsequent launches are instant (cached).</p>
              </div>
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
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading ~2MB &amp; Launching...</>
                ) : shutup10Status === "done" ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
                ) : shutup10Status === "error" ? (
                  <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> Download & Launch ShutUp10++</>
                )}
              </Button>
              {!window.electronAPI && (
                <p className="text-[10px] text-muted-foreground/50 text-center">Requires the desktop .exe app</p>
              )}
            </div>
          </UtilCard>

        </div>

        {/* System Info */}
        <UtilCard icon={MapPin} title="System Information" description="Detailed hardware and OS info" delay={0.20}>
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

      </div>
    </div>
  );
}
