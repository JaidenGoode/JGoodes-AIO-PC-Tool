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
  AlertTriangle, MapPin, Loader2, ChevronDown,
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

  const utilityMutation = useMutation({
    mutationFn: (action: string) => runUtility(action) as Promise<{ name: string; description: string; message?: string }>,
    onSuccess: (data) => {
      toast({ title: data.name || "Done", description: data.description || data.message || "Command ready to run as Administrator." });
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

  const handleToggle = (key: string, action: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    run(action);
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
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
                variant="outline"
                className="w-full h-7 text-xs border-border/60 hover:border-primary/30"
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

        {/* Explorer */}
        <UtilCard icon={RefreshCw} title="Restart Explorer" description="Fixes taskbar, desktop, and shell issues" delay={0.10}>
          <RunButton action="restart-explorer" label="Restart Explorer" pending={isPending("restart-explorer")} onRun={run} />
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

        {/* System Info */}
        <UtilCard icon={MapPin} title="System Information" description="Detailed hardware and OS info" delay={0.18}>
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
