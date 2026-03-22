import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Cpu, MemoryStick, Monitor, HardDrive, Wrench,
  ArrowRight, Thermometer, Zap, ShieldCheck, Activity, Sparkles, Info,
  Globe, Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSystemInfo, useSystemUsage, useTemps } from "@/hooks/use-system";
import { useTweaks } from "@/hooks/use-tweaks";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createRestorePoint } from "@/lib/api";
import { cn } from "@/lib/utils";

type TempData = {
  cpu: { current: number | null; max: number | null };
  gpu: { current: number | null; hotspot?: number | null };
};

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-muted-foreground/70 shrink-0">{label}</span>
      <span className={cn("text-[11px] font-bold font-mono tabular-nums", color ?? "text-foreground")}>{value}</span>
    </div>
  );
}

function TipDivider() {
  return <div className="border-t border-border/30 my-1.5" />;
}

function LiveBar({
  label,
  value,
  unit = "%",
  sublabel,
}: {
  label: string;
  value: number | null;
  unit?: string;
  sublabel?: string;
}) {
  const pct = value ?? 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-bold text-foreground/70 w-9 shrink-0 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex-1 h-2.5 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 progress-gradient-fill"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <span className={cn(
          "text-[12px] font-black font-mono tabular-nums w-11 text-right shrink-0",
          value === null ? "text-muted-foreground/30" : "text-foreground"
        )}>
          {value === null ? "N/A" : `${value}${unit}`}
        </span>
      </div>
      {sublabel && (
        <p className="text-[9.5px] text-muted-foreground/35 pl-11 leading-none">{sublabel}</p>
      )}
    </div>
  );
}

function TempDot({ temp }: { temp: number | null }) {
  if (!temp) return <span className="text-muted-foreground/30 font-mono text-xs">N/A</span>;
  const color = temp < 55 ? "text-green-400" : temp < 75 ? "text-amber-400" : "text-primary";
  return <span className={cn("font-bold font-mono text-xs tabular-nums", color)}>{temp}°C</span>;
}

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

function HealthRing({ score, grade, gradeColor }: { score: number; grade: string; gradeColor: string }) {
  const offset = RING_C * (1 - Math.min(score, 100) / 100);
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={RING_R} fill="none"
          stroke={gradeColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 6px ${gradeColor}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums leading-none" style={{ color: gradeColor }}>
          {score}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground/50 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function HealthScoreCard({
  activeTweaks, totalTweaks, usage,
}: {
  activeTweaks: number;
  totalTweaks: number;
  usage: any;
}) {
  const { score, grade, gradeColor, factors } = useMemo(() => {
    const tweakPct   = totalTweaks > 0 ? (activeTweaks / totalTweaks) * 100 : 0;
    const ramFree    = usage ? 100 - (usage.ram?.usage ?? 50) : 50;
    const diskFree   = usage ? 100 - (usage.disk?.usage ?? 50) : 50;
    const cpuFree    = usage ? 100 - (usage.cpu?.usage ?? 50) : 50;

    const sc = Math.round(tweakPct * 0.50 + ramFree * 0.20 + diskFree * 0.15 + cpuFree * 0.15);

    const g  = sc >= 85 ? "A" : sc >= 70 ? "B" : sc >= 55 ? "C" : sc >= 40 ? "D" : "F";
    const gc =
      sc >= 85 ? "#4ade80"
      : sc >= 70 ? "#60a5fa"
      : sc >= 55 ? "#fbbf24"
      : sc >= 40 ? "#fb923c"
      : "hsl(var(--primary))";

    return {
      score: Math.min(sc, 100),
      grade: g,
      gradeColor: gc,
      factors: [
        { label: "Tweaks",    pct: tweakPct, weight: "50%", barOpacity: 1.00 },
        { label: "RAM free",  pct: ramFree,  weight: "20%", barOpacity: 0.72 },
        { label: "Disk free", pct: diskFree, weight: "15%", barOpacity: 0.52 },
        { label: "CPU idle",  pct: cpuFree,  weight: "15%", barOpacity: 0.38 },
      ],
    };
  }, [activeTweaks, totalTweaks, usage]);

  const gradeDesc: Record<string, string> = {
    A: "Excellent — fully optimized",
    B: "Good — minor improvements possible",
    C: "Fair — several tweaks available",
    D: "Below average — optimize recommended",
    F: "Poor — many improvements possible",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="p-4 rounded-xl border border-border bg-card card-premium"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          System Health Score
        </span>
        <span
          className="ml-auto text-[11px] font-black px-2 py-0.5 rounded-md"
          style={{ color: gradeColor, background: `${gradeColor}18`, border: `1px solid ${gradeColor}35` }}
        >
          Grade {grade}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <HealthRing score={score} grade={grade} gradeColor={gradeColor} />

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[11px] text-muted-foreground/60 leading-snug mb-3">
            {gradeDesc[grade]}
          </p>
          {factors.map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/60">{f.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground/30 font-mono">{f.weight}</span>
                  <span className="text-[10px] font-bold font-mono tabular-nums text-primary">
                    {Math.round(f.pct)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 progress-gradient-fill"
                  style={{ width: `${Math.min(100, f.pct)}%`, opacity: f.barOpacity }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: sysInfo, isLoading: sysLoading } = useSystemInfo();
  const { data: tweaks } = useTweaks();
  const { data: usage } = useSystemUsage();
  const { data: temps } = useTemps() as { data: TempData | undefined };
  const { toast } = useToast();
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreName, setRestoreName] = useState("JGoode A.I.O - Pre-Optimization");
  const [isCreating, setIsCreating] = useState(false);

  const activeTweaks = tweaks?.filter((t) => t.isActive).length || 0;
  const totalTweaks = tweaks?.length || 0;
  const sys = sysInfo as any;

  const handleCreateRestorePoint = async () => {
    try {
      setIsCreating(true);
      await createRestorePoint(restoreName);
      toast({ title: "Restore Point Created", description: `"${restoreName}" created successfully.` });
      setIsRestoreOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to create restore point.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            System <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time overview and controls</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsRestoreOpen(true)}
          data-testid="button-create-restore"
          className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 text-xs h-8"
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-primary" />
          Restore Point
        </Button>
      </motion.div>

      {/* Active tweaks banner */}
      {activeTweaks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/6"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                <span className="text-primary">{activeTweaks}</span>
                <span className="text-muted-foreground font-normal"> / {totalTweaks} tweaks active</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Optimizations applied to your system</p>
            </div>
          </div>
          <Link href="/tweaks">
            <Button
              size="sm"
              className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 text-xs h-7"
            >
              Manage <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* System Health Score */}
      <HealthScoreCard
        activeTweaks={activeTweaks}
        totalTweaks={totalTweaks}
        usage={usage}
      />

      {/* System Info */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em]">
            Hardware
          </p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/8 border border-amber-500/15">
            <Info className="h-2.5 w-2.5 text-amber-400/70 shrink-0" />
            <span className="text-[9.5px] text-amber-400/70 leading-none">
              Showing host server stats · Run locally on Windows for your hardware
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Cpu className="w-4 h-4" />}
            title="Processor"
            primaryValue={sys?.cpu?.model || "Unknown CPU"}
            secondaryValue={
              (sys as any)?.cpu?.physicalCores || (sys as any)?.cpu?.threads
                ? `${(sys as any).cpu.physicalCores || (sys as any).cpu.threads} Cores · ${(sys as any).cpu.threads || (sys as any).cpu.physicalCores} Threads${(sys as any).cpu.speed ? ` · ${(sys as any).cpu.speed} GHz` : ""}`
                : "—"
            }
            delay={0.04}
            isLoading={sysLoading}
          />
          <StatCard
            icon={<Monitor className="w-4 h-4" />}
            title="Graphics"
            primaryValue={sys?.gpu?.model || "Unknown GPU"}
            secondaryValue={sys?.gpu?.vram || "—"}
            delay={0.08}
            isLoading={sysLoading}
          />
          <StatCard
            icon={<MemoryStick className="w-4 h-4" />}
            title="Memory"
            primaryValue={sys?.memory?.total || "—"}
            secondaryValue={
              sys?.memory?.used
                ? `${sys.memory.used} in use · ${sys.memory.type}`
                : sys?.memory?.type || "DDR"
            }
            delay={0.12}
            isLoading={sysLoading}
          />
          <StatCard
            icon={<HardDrive className="w-4 h-4" />}
            title="Storage"
            primaryValue={sys?.storage?.totalSpace || "—"}
            secondaryValue={
              sys?.storage?.freeSpace
                ? `${sys.storage.freeSpace} free`
                : sys?.storage?.primaryDisk || "C:"
            }
            delay={0.16}
            isLoading={sysLoading}
          />
        </div>
      </div>

      {/* Live Usage + Temps */}
      <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Live Usage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border border-border bg-card card-premium"
        >
          <div className="flex items-center justify-between mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-default select-none group">
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground/70 uppercase tracking-wider transition-colors">
                    Live Usage
                  </span>
                  <Info className="h-3 w-3 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="p-0 border-border/60 bg-card shadow-2xl w-64">
                <div className="px-3 py-2.5 border-b border-border/40 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">System Usage</span>
                </div>
                <div className="p-3 space-y-2.5">
                  {/* CPU */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Processor</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", usage?.cpu?.usage == null ? "text-muted-foreground/30" : usage.cpu.usage < 50 ? "text-green-400" : usage.cpu.usage < 80 ? "text-amber-400" : "text-primary")}>
                        {usage?.cpu?.usage != null ? `${usage.cpu.usage}%` : "N/A"}
                      </span>
                    </div>
                    {sys?.cpu?.model && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-tight truncate">{sys.cpu.model}</p>}
                    {usage?.cpu?.cores != null && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-none">{usage.cpu.cores} logical processors · {usage?.cpu?.usage != null ? `${100 - usage.cpu.usage}% idle` : ""}</p>}
                  </div>
                  <TipDivider />
                  {/* RAM */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MemoryStick className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Memory</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", usage?.ram?.usage == null ? "text-muted-foreground/30" : usage.ram.usage < 60 ? "text-green-400" : usage.ram.usage < 85 ? "text-amber-400" : "text-primary")}>
                        {usage?.ram?.usage != null ? `${usage.ram.usage}%` : "N/A"}
                      </span>
                    </div>
                    {usage?.ram && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-none">{usage.ram.usedGb} GB used · {Math.max(0, parseFloat((usage.ram.totalGb - usage.ram.usedGb).toFixed(1)))} GB free · {usage.ram.totalGb} GB total</p>}
                  </div>
                  <TipDivider />
                  {/* GPU */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Graphics</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", usage?.gpu?.usage == null ? "text-muted-foreground/30" : usage.gpu.usage < 50 ? "text-green-400" : usage.gpu.usage < 85 ? "text-amber-400" : "text-primary")}>
                        {usage?.gpu?.usage != null ? `${usage.gpu.usage}%` : "N/A"}
                      </span>
                    </div>
                    {usage?.gpu?.model && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-tight truncate">{usage.gpu.model}</p>}
                    {sys?.gpu?.vram && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-none">{sys.gpu.vram} VRAM</p>}
                  </div>
                  <TipDivider />
                  {/* Disk */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Primary Drive</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", usage?.disk?.usage == null ? "text-muted-foreground/30" : usage.disk.usage < 70 ? "text-green-400" : usage.disk.usage < 90 ? "text-amber-400" : "text-primary")}>
                        {usage?.disk?.usage != null ? `${usage.disk.usage}%` : "N/A"}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-none">
                      R: {usage?.disk?.readMb ?? 0} MB/s · W: {usage?.disk?.writeMb ?? 0} MB/s
                    </p>
                  </div>
                </div>
                <div className="px-3 py-2 border-t border-border/40 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse shrink-0" />
                  <span className="text-[9.5px] text-muted-foreground/40">Refreshes every 5 seconds</span>
                </div>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" />
              <span className="text-[10px] text-muted-foreground/40 font-mono">5s refresh</span>
            </div>
          </div>
          <div className="space-y-3.5">
            <LiveBar label="CPU" value={usage?.cpu?.usage ?? null} sublabel={usage?.cpu?.cores ? `${usage.cpu.cores} threads` : undefined} />
            <LiveBar label="RAM" value={usage?.ram?.usage ?? null} sublabel={usage?.ram ? `${usage.ram.usedGb} / ${usage.ram.totalGb} GB` : undefined} />
            <LiveBar label="GPU" value={usage?.gpu?.usage ?? null} sublabel={usage?.gpu?.model ?? undefined} />
            <LiveBar label="Disk" value={usage?.disk?.usage ?? null} />
          </div>
        </motion.div>

        {/* Temperatures */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="p-4 rounded-xl border border-border bg-card card-premium"
        >
          <div className="flex items-center gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-default select-none group">
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Thermometer className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground/70 uppercase tracking-wider transition-colors">
                    Temperatures
                  </span>
                  <Info className="h-3 w-3 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="p-0 border-border/60 bg-card shadow-2xl w-64">
                <div className="px-3 py-2.5 border-b border-border/40 flex items-center gap-2">
                  <Thermometer className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Thermal Readings</span>
                </div>
                <div className="p-3 space-y-2.5">
                  {/* CPU temp */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">CPU Temperature</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", temps?.cpu?.current == null ? "text-muted-foreground/30" : temps.cpu.current < 55 ? "text-green-400" : temps.cpu.current < 75 ? "text-amber-400" : "text-primary")}>
                        {temps?.cpu?.current != null ? `${temps.cpu.current}°C` : "N/A"}
                      </span>
                    </div>
                    {sys?.cpu?.model && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-tight truncate">{sys.cpu.model}</p>}
                    <p className="text-[9.5px] text-muted-foreground/35 pl-4.5 leading-none">
                      {temps?.cpu?.current == null ? "Sensor not detected" : temps.cpu.current < 55 ? "Cool — normal idle" : temps.cpu.current < 75 ? "Warm — under load" : "Hot — check cooling"}
                    </p>
                  </div>
                  <TipDivider />
                  {/* GPU temp */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">GPU Core</span>
                      </div>
                      <span className={cn("text-[11px] font-bold font-mono tabular-nums", temps?.gpu?.current == null ? "text-muted-foreground/30" : temps.gpu.current < 55 ? "text-green-400" : temps.gpu.current < 80 ? "text-amber-400" : "text-primary")}>
                        {temps?.gpu?.current != null ? `${temps.gpu.current}°C` : "N/A"}
                      </span>
                    </div>
                    {temps?.gpu?.hotspot != null && (
                      <div className="flex items-center justify-between pl-4.5">
                        <span className="text-[9.5px] text-muted-foreground/50">Hot spot junction</span>
                        <span className={cn("text-[9.5px] font-bold font-mono tabular-nums", temps.gpu.hotspot < 85 ? "text-amber-400/70" : "text-primary/70")}>{temps.gpu.hotspot}°C</span>
                      </div>
                    )}
                    {sys?.gpu?.model && <p className="text-[9.5px] text-muted-foreground/40 pl-4.5 leading-tight truncate">{sys.gpu.model}</p>}
                  </div>
                </div>
                <div className="px-3 py-2 border-t border-border/40">
                  <p className="text-[9.5px] text-muted-foreground/40">Via LibreHardwareMonitor · Admin required</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {[
              { label: "CPU", sublabel: "Processor", temp: temps?.cpu?.current ?? null, icon: Cpu, maxTemp: 110 },
              { label: "GPU", sublabel: "Graphics", temp: temps?.gpu?.current ?? null, icon: Monitor, maxTemp: 110 },
            ].map(({ label, sublabel, temp, icon: Icon, maxTemp }) => {
              const pct = temp ? Math.min((temp / maxTemp) * 100, 100) : 0;
              const valueColor = temp == null
                ? "text-muted-foreground/30"
                : temp < 55
                  ? "text-green-400"
                  : temp < 75
                    ? "text-amber-400"
                    : "text-primary";
              return (
                <div key={label} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <div>
                          <span className="text-[12px] font-bold text-foreground/80 uppercase tracking-wide">{label}</span>
                          <span className="text-[10px] text-muted-foreground/40 ml-1.5">{sublabel}</span>
                        </div>
                        <span className={cn("text-[18px] font-black font-mono tabular-nums leading-none", valueColor)}>
                          {temp != null ? `${temp}°C` : "N/A"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 progress-gradient-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9.5px] text-muted-foreground/35 mt-1 leading-none">
                        {temp == null ? "Sensor not detected" : temp < 55 ? "Cool — normal idle" : temp < 75 ? "Warm — under load" : "Hot — check cooling"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border/40">
            {(temps?.cpu?.current || temps?.gpu?.current) ? (
              <p className="text-[10px] text-green-400/60 text-center">Hardware sensors active</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/30 text-center leading-relaxed">
                Sensor data via LibreHardwareMonitor · Run on Windows as Admin
              </p>
            )}
          </div>
        </motion.div>
      </div>
      </TooltipProvider>

      {/* Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="p-4 rounded-xl border border-border bg-card card-premium"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Quick Access
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { href: "/cleaner",   icon: Sparkles,    label: "Cleaner",      desc: "Remove junk" },
            { href: "/tweaks",    icon: Wrench,      label: "Tweaks",       desc: "Optimize Windows" },
            { href: "/utilities", icon: Activity,    label: "Utilities",    desc: "System tools" },
            { href: "/dns",       icon: Globe,         label: "DNS",          desc: "DNS settings" },
            { href: "/restore",   icon: ShieldCheck,  label: "Restore",      desc: "System protection" },
            { href: "/settings",  icon: SettingsIcon, label: "Settings",     desc: "App preferences" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <div
                data-testid={`card-quick-${label.toLowerCase()}`}
                className="flex flex-col items-center p-3 rounded-xl border border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 cursor-pointer group text-center"
              >
                <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground leading-none">
                  {label}
                </span>
                <span className="text-[9px] text-muted-foreground/40 mt-0.5">{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* OS Info */}
      {(sys?.system?.os || sysLoading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border/30 bg-secondary/10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
          {sysLoading ? (
            <span className="text-[11px] text-muted-foreground/40">Loading system info...</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">
              <span className="text-muted-foreground/70 font-medium">{sys?.system?.os || "Unknown OS"}</span>
              {sys?.system?.version && <span className="ml-2">v{sys.system.version}</span>}
              {sys?.cpu?.model && <span className="ml-2 text-muted-foreground/30">· {sys.cpu.model}</span>}
            </span>
          )}
        </motion.div>
      )}

      {/* Restore Dialog */}
      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Create Restore Point</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Give your restore point a name to identify it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={restoreName}
              onChange={(e) => setRestoreName(e.target.value)}
              placeholder="Enter restore point name"
              className="bg-secondary border-border"
              data-testid="input-restore-name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary text-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCreateRestorePoint(); }}
              disabled={isCreating}
              className="bg-primary text-white text-sm"
              data-testid="button-confirm-restore"
            >
              {isCreating ? "Creating..." : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
