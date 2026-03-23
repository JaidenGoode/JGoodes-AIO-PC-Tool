import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import {
  Cpu, MemoryStick, Monitor, HardDrive, Wrench,
  ArrowRight, Thermometer, Zap, ShieldCheck, Activity, Sparkles,
  Globe, Settings as SettingsIcon, TrendingUp, MonitorCheck,
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

function UsageBar({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  sublabel?: string;
  icon: React.ElementType;
}) {
  const pct = value ?? 0;
  const color =
    value == null ? "text-muted-foreground/30"
    : pct < 50 ? "text-green-400"
    : pct < 80 ? "text-amber-400"
    : "text-primary";

  return (
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-secondary/40 shrink-0 border border-border/30">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-foreground/60 uppercase tracking-wide">
            {label}
          </span>
          <span className={cn("text-[13px] font-black font-mono tabular-nums leading-none", color)}>
            {value == null ? "N/A" : `${value}%`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-gradient-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {sublabel && (
          <p className="text-[9.5px] text-muted-foreground/30 leading-none">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

function TempGauge({ label, temp, icon: Icon }: { label: string; temp: number | null; icon: React.ElementType }) {
  const color =
    temp == null ? "text-muted-foreground/25"
    : temp < 55 ? "text-green-400"
    : temp < 75 ? "text-amber-400"
    : "text-primary";
  const bgColor =
    temp == null ? "bg-secondary/30"
    : temp < 55 ? "bg-green-400/10"
    : temp < 75 ? "bg-amber-400/10"
    : "bg-primary/10";
  const borderColor =
    temp == null ? "border-border/30"
    : temp < 55 ? "border-green-400/20"
    : temp < 75 ? "border-amber-400/20"
    : "border-primary/25";
  const status =
    temp == null ? "No sensor"
    : temp < 55 ? "Cool"
    : temp < 75 ? "Warm"
    : "Hot";

  const pct = temp ? Math.min((temp / 110) * 100, 100) : 0;

  return (
    <div className={cn("flex items-center gap-3.5 p-3 rounded-xl border transition-all", bgColor, borderColor)}>
      <div className={cn("p-2 rounded-lg border", bgColor, borderColor)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/60 uppercase tracking-wide">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", color, bgColor, borderColor)}>{status}</span>
            <span className={cn("text-[18px] font-black font-mono tabular-nums leading-none", color)}>
              {temp != null ? `${temp}°` : "—"}
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-gradient-fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  href, Icon, label, desc, iconColor, glowColor, borderHover,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  desc: string;
  iconColor: string;
  glowColor: string;
  borderHover: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-testid={`card-quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex flex-col items-center gap-2 p-3.5 rounded-xl border cursor-pointer text-center transition-all duration-200"
      style={{
        background: hovered ? glowColor : "hsl(var(--secondary) / 0.12)",
        borderColor: hovered ? borderHover : "hsl(var(--border) / 0.35)",
        boxShadow: hovered ? `0 0 16px ${glowColor}` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="p-2.5 rounded-xl border transition-all duration-200"
        style={{
          background: hovered ? glowColor : "hsl(var(--secondary) / 0.35)",
          borderColor: hovered ? borderHover : "hsl(var(--border) / 0.25)",
        }}
      >
        <Icon
          style={{ width: "18px", height: "18px", color: hovered ? iconColor : "hsl(var(--muted-foreground) / 0.4)", transition: "color 0.2s" }}
        />
      </div>
      <div>
        <span
          className="text-[11px] font-bold leading-none block transition-colors duration-200"
          style={{ color: hovered ? "hsl(var(--foreground) / 0.9)" : "hsl(var(--foreground) / 0.55)" }}
        >
          {label}
        </span>
        <span className="text-[9px] text-muted-foreground/30 mt-0.5 block leading-tight">{desc}</span>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/cleaner",   icon: Sparkles,    label: "PC Cleaner",   desc: "Remove junk files",    iconColor: "#60a5fa", glowColor: "rgba(96,165,250,0.1)",  borderHover: "rgba(96,165,250,0.2)"  },
  { href: "/tweaks",    icon: Wrench,      label: "Tweaks",       desc: "Optimize Windows",     iconColor: "hsl(var(--primary))", glowColor: "hsl(var(--primary) / 0.1)", borderHover: "hsl(var(--primary) / 0.25)" },
  { href: "/utilities", icon: Activity,   label: "Utilities",    desc: "System tools",         iconColor: "#a78bfa", glowColor: "rgba(167,139,250,0.1)", borderHover: "rgba(167,139,250,0.2)" },
  { href: "/dns",       icon: Globe,       label: "DNS Manager",  desc: "Network DNS",          iconColor: "#22d3ee", glowColor: "rgba(34,211,238,0.1)",  borderHover: "rgba(34,211,238,0.2)"  },
  { href: "/startup",   icon: MonitorCheck,label: "Startup Mgr",  desc: "Startup apps",         iconColor: "#fbbf24", glowColor: "rgba(251,191,36,0.1)",  borderHover: "rgba(251,191,36,0.2)"  },
  { href: "/restore",   icon: ShieldCheck, label: "Restore",      desc: "System protection",    iconColor: "#4ade80", glowColor: "rgba(74,222,128,0.1)",  borderHover: "rgba(74,222,128,0.2)"  },
];

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

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border/60"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--primary) / 0.04) 100%)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px hsl(var(--border) / 0.5)"
        }}
      >
        {/* radial glow top-right */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)" }}
        />
        {/* gradient accent line top */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

        <div className="px-6 py-5 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-primary/25 bg-primary/8">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/80 font-mono">
                    System Online
                  </span>
                </div>
              </div>
              <h1 className="text-[26px] font-black text-foreground tracking-tight leading-none">
                System <span className="text-primary">Dashboard</span>
              </h1>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Real-time monitoring, optimization & control
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRestoreOpen(true)}
                data-testid="button-create-restore"
                className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 text-xs h-8 gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Restore Point
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Active Tweaks",
                value: activeTweaks > 0 ? `${activeTweaks}` : "None",
                sub: `of ${totalTweaks} available`,
                icon: Zap,
                highlight: activeTweaks > 0,
              },
              {
                label: "CPU Usage",
                value: usage?.cpu?.usage != null ? `${usage.cpu.usage}%` : "—",
                sub: usage?.cpu?.cores ? `${usage.cpu.cores} threads` : "Processor",
                icon: Cpu,
                highlight: false,
              },
              {
                label: "RAM Used",
                value: usage?.ram?.usedGb != null ? `${usage.ram.usedGb} GB` : "—",
                sub: usage?.ram?.totalGb ? `of ${usage.ram.totalGb} GB total` : "Memory",
                icon: MemoryStick,
                highlight: false,
              },
              {
                label: "CPU Temp",
                value: temps?.cpu?.current != null ? `${temps.cpu.current}°C` : "—",
                sub: temps?.cpu?.current != null
                  ? (temps.cpu.current < 55 ? "Running cool" : temps.cpu.current < 75 ? "Under load" : "Running hot")
                  : "Sensor N/A",
                icon: Thermometer,
                highlight: false,
              },
            ].map(({ label, value, sub, icon: Icon, highlight }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border transition-colors",
                  highlight
                    ? "bg-primary/8 border-primary/20"
                    : "bg-secondary/20 border-border/30 hover:border-border/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg border shrink-0",
                  highlight ? "bg-primary/15 border-primary/20" : "bg-secondary/40 border-border/30"
                )}>
                  <Icon className={cn("h-3.5 w-3.5", highlight ? "text-primary" : "text-muted-foreground/50")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[8.5px] font-black text-muted-foreground/35 uppercase tracking-[0.15em] leading-none mb-1">{label}</div>
                  <div className={cn("text-[15px] font-black font-mono tabular-nums leading-none", highlight ? "text-primary" : "text-foreground")}>
                    {value}
                  </div>
                  <div className="text-[9px] text-muted-foreground/40 mt-0.5 leading-none truncate">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── ACTIVE TWEAKS BANNER ─────────────────────────────────── */}
      {activeTweaks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary/20 bg-primary/5"
          style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/20">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-foreground">
                <span className="text-primary font-black">{activeTweaks}</span>
                <span className="text-muted-foreground font-normal"> performance tweaks currently active</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50">Your system is running with applied optimizations</p>
            </div>
          </div>
          <Link href="/tweaks">
            <Button size="sm" className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 text-xs h-7 gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* ── HARDWARE STATS ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-[1px] w-4 bg-primary/40 rounded-full" />
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.18em]">Hardware</p>
          <div className="flex-1 h-[1px] bg-border/30 rounded-full" />
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

      {/* ── LIVE MONITORING ─────────────────────────────────────── */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Live Usage */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border/70 bg-card overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.15em]">
                  Live Usage
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                <span className="text-[9px] text-muted-foreground/30 font-mono">LIVE</span>
              </div>
            </div>
            <div className="p-4 space-y-3.5">
              <UsageBar
                label="CPU"
                value={usage?.cpu?.usage ?? null}
                sublabel={usage?.cpu?.cores ? `${usage.cpu.cores} logical processors` : undefined}
                icon={Cpu}
              />
              <UsageBar
                label="RAM"
                value={usage?.ram?.usage ?? null}
                sublabel={usage?.ram ? `${usage.ram.usedGb} GB / ${usage.ram.totalGb} GB` : undefined}
                icon={MemoryStick}
              />
              <UsageBar
                label="GPU"
                value={usage?.gpu?.usage ?? null}
                sublabel={usage?.gpu?.model ?? undefined}
                icon={Monitor}
              />
              <UsageBar
                label="Disk"
                value={usage?.disk?.usage ?? null}
                sublabel={usage?.disk ? `R: ${usage.disk.readMb ?? 0} MB/s · W: ${usage.disk.writeMb ?? 0} MB/s` : undefined}
                icon={HardDrive}
              />
            </div>
          </motion.div>

          {/* Temperatures */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="rounded-xl border border-border/70 bg-card overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
                  <Thermometer className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.15em]">
                  Temperatures
                </span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/30 font-mono">
                Via LibreHardwareMonitor
              </span>
            </div>
            <div className="p-4 space-y-3">
              <TempGauge label="CPU — Processor" temp={temps?.cpu?.current ?? null} icon={Cpu} />
              <TempGauge label="GPU — Graphics" temp={temps?.gpu?.current ?? null} icon={Monitor} />
              {temps?.gpu?.hotspot != null && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/25">
                  <span className="text-[10px] text-muted-foreground/50">GPU Hot Spot Junction</span>
                  <span className={cn(
                    "text-[12px] font-black font-mono tabular-nums",
                    temps.gpu.hotspot < 85 ? "text-amber-400" : "text-primary"
                  )}>{temps.gpu.hotspot}°C</span>
                </div>
              )}
              <div className="pt-1">
                {(temps?.cpu?.current || temps?.gpu?.current) ? (
                  <p className="text-[10px] text-green-400/50 text-center font-mono">● Hardware sensors active</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/25 text-center leading-relaxed">
                    Run on Windows as Administrator to enable sensor data
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </TooltipProvider>

      {/* ── QUICK ACCESS ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="rounded-xl border border-border/70 bg-card overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
      >
        <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.15em]">
            Quick Access
          </span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {QUICK_LINKS.map(({ href, icon: Icon, label, desc, iconColor, glowColor, borderHover }) => (
            <Link key={href} href={href}>
              <QuickCard
                href={href}
                Icon={Icon}
                label={label}
                desc={desc}
                iconColor={iconColor}
                glowColor={glowColor}
                borderHover={borderHover}
              />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── OS INFO BAR ─────────────────────────────────────────── */}
      {(sys?.system?.os || sysLoading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/25 bg-secondary/8"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 animate-pulse" />
          {sysLoading ? (
            <span className="text-[10px] text-muted-foreground/30">Loading system information...</span>
          ) : (
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              <span className="text-muted-foreground/60 font-bold">{sys?.system?.os || "Unknown OS"}</span>
              {sys?.system?.version && <span className="ml-2 text-muted-foreground/30">Build {sys.system.version}</span>}
              {sys?.cpu?.model && <span className="ml-3 text-muted-foreground/20">· {sys.cpu.model}</span>}
            </span>
          )}
        </motion.div>
      )}

      {/* ── RESTORE POINT DIALOG ────────────────────────────────── */}
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
