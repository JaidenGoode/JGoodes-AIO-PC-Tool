import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu, MemoryStick, Monitor, HardDrive, Wrench,
  ArrowRight, Thermometer, Zap, ShieldCheck, Activity, Sparkles, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { useSystemInfo, useSystemUsage } from "@/hooks/use-system";
import { useTweaks } from "@/hooks/use-tweaks";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createRestorePoint, getTemps } from "@/lib/api";
import { cn } from "@/lib/utils";

type TempData = {
  cpu: { current: number | null; max: number | null };
  gpu: { current: number | null };
};

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
  const { data: temps } = useQuery<TempData>({
    queryKey: ["/api/system/temps"],
    queryFn: getTemps as () => Promise<TempData>,
    refetchInterval: 15000,
  });
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
              sys?.cpu?.cores
                ? `${sys.cpu.cores} Cores${sys.cpu.speed ? ` · ${sys.cpu.speed} GHz` : ""}`
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Live Usage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Activity className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Live Usage
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" />
              <span className="text-[10px] text-muted-foreground/40 font-mono">4s refresh</span>
            </div>
          </div>
          <div className="space-y-3.5">
            <LiveBar
              label="CPU"
              value={usage?.cpu?.usage ?? null}
              sublabel={usage?.cpu?.cores ? `${usage.cpu.cores} cores` : undefined}
            />
            <LiveBar
              label="RAM"
              value={usage?.ram?.usage ?? null}
              sublabel={
                usage?.ram
                  ? `${usage.ram.usedGb} / ${usage.ram.totalGb} GB`
                  : undefined
              }
            />
            <LiveBar
              label="GPU"
              value={usage?.gpu?.usage ?? null}
              sublabel={usage?.gpu?.model ?? undefined}
            />
            <LiveBar
              label="Disk"
              value={usage?.disk?.usage ?? null}
            />
          </div>
        </motion.div>

        {/* Temperatures */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="p-4 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Thermometer className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Temperatures
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: "CPU Temp",  temp: temps?.cpu?.current ?? null, icon: Cpu },
              { label: "GPU Temp",  temp: temps?.gpu?.current ?? null, icon: Monitor },
              { label: "CPU Peak",  temp: temps?.cpu?.max ?? null,     icon: Thermometer },
            ].map(({ label, temp, icon: Icon }) => {
              const pct   = temp ? Math.min((temp / 110) * 100, 100) : 0;
              const barBg = temp
                ? temp < 55
                  ? "linear-gradient(90deg,#16a34a80,#22c55e)"
                  : temp < 75
                    ? "linear-gradient(90deg,#d9770680,#f59e0b)"
                    : "linear-gradient(90deg,hsl(var(--primary)/0.6),hsl(var(--primary)))"
                : undefined;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                    <TempDot temp={temp} />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: barBg }}
                    />
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
                Temps require local install &amp; admin rights on Windows
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="p-4 rounded-xl border border-border bg-card"
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
            { href: "/dns",       icon: HardDrive,   label: "DNS",          desc: "DNS settings" },
            { href: "/restore",   icon: ShieldCheck, label: "Restore",      desc: "System protection" },
            { href: "/settings",  icon: Cpu,         label: "Settings",     desc: "App preferences" },
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
