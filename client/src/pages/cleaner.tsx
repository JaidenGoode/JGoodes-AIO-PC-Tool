import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Package, FileText, Image as ImageIcon,
  Globe, ScanLine, Sparkles,
  CheckSquare, Square, Loader2, CheckCircle2, AlertCircle,
  Cpu, RefreshCw, Database, Layers, Archive, History,
  MessageSquare, Gamepad2, Download, Info, ShieldCheck,
  Monitor, Music, Video, Lock, Shield, Users, HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { scanCleaner, cleanCategories, getCleaningHistory } from "@/lib/api";
import type { ScanCategory, ScanResult, CleanResult } from "@/lib/api";
import { cn } from "@/lib/utils";

type PageState = "idle" | "scanning" | "scanned" | "cleaning" | "done";
type GroupId = "system" | "apps" | "games" | "browser" | "privacy" | "recycle" | "downloads" | "backup";

// ── Group configuration ──────────────────────────────────────────────────────
const GROUP_CONFIG: Record<GroupId, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
  activeBorder: string;
}> = {
  system:    { label: "System Junk Files",   icon: Monitor,    color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  apps:      { label: "App Junk Files",       icon: Package,    color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  games:     { label: "Game Junk Files",      icon: Gamepad2,   color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  browser:   { label: "Browser Junk Files",   icon: Globe,      color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  privacy:   { label: "Browser Privacy",      icon: Shield,     color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  recycle:   { label: "Recycle Bin",          icon: Archive,    color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  downloads: { label: "Downloaded Files",     icon: Download,   color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
  backup:    { label: "Backup Files",         icon: HardDrive,  color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20", activeBg: "bg-primary/6",  activeBorder: "border-l-primary" },
};

const GROUP_ORDER: GroupId[] = ["system", "apps", "games", "browser", "privacy", "recycle", "downloads", "backup"];

const CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  temp: Trash2, prefetch: Cpu, wupdate: RefreshCw, deliveryopt: Download,
  errorreports: AlertCircle, logs: FileText, dumpfiles: Database,
  thumbnails: ImageIcon, shadercache: Layers, iconcache: ImageIcon, recentfiles: History,
  discord: MessageSquare, spotify: Music, teams: Users, zoom: Video,
  slack: MessageSquare, obs: Video, roblox: Gamepad2,
  vscode: Monitor, vlc: Video, riot: Gamepad2, minecraft: Gamepad2,
  geforce: Layers, adobecc: ImageIcon,
  steam: Gamepad2, epic: Gamepad2, gog: Gamepad2, ea: Gamepad2,
  ubisoft: Gamepad2, battlenet: Gamepad2,
  chrome: Globe, edge: Globe, firefox: Globe, operagx: Globe, brave: Globe, vivaldi: Globe,
  chromeprivacy: Lock, edgeprivacy: Lock, firefoxprivacy: Lock, operagxprivacy: Lock, vivaldiPrivacy: Lock,
  recycle: Archive,
  dl_installers: Download, dl_partial: Download, dl_winodd: Download,
  winold: HardDrive, backup_wbadmin: HardDrive, backup_wiebkup: HardDrive,
};

const SCAN_STEPS = [
  "System temp files & caches",
  "Windows prefetch & logs",
  "Delivery Optimization cache",
  "Discord, Spotify & Teams cache",
  "Steam, Epic & GOG cache",
  "EA, Ubisoft & Battle.net cache",
  "Chrome & Edge cache",
  "Firefox & Opera GX cache",
  "Browser history & cookies",
  "Windows Update downloads",
  "DirectX shader cache",
  "Memory dump files",
  "Downloads folder installers",
  "Windows.old & backup files",
  "Recycle Bin contents",
];

function fmtSizeLocal(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${time}`;
}

function groupCategories(categories: ScanCategory[]) {
  const grouped: Partial<Record<GroupId, ScanCategory[]>> = {};
  for (const cat of categories) {
    const g = cat.group as GroupId;
    if (g !== "system" && g !== "recycle" && !cat.installed) continue;
    if (!grouped[g]) grouped[g] = [];
    grouped[g]!.push(cat);
  }
  return grouped;
}

// ── Sub-item row ─────────────────────────────────────────────────────────────
function SubItemRow({
  cat,
  isSelected,
  cfg,
  totalSize,
  onToggle,
}: {
  cat: ScanCategory;
  isSelected: boolean;
  cfg: typeof GROUP_CONFIG[GroupId];
  totalSize: number;
  onToggle: () => void;
}) {
  const Icon = CAT_ICONS[cat.id] || Trash2;
  const pct = totalSize > 0 ? (cat.size / totalSize) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border/20 transition-all duration-150 last:border-0",
        cat.found ? "cursor-pointer" : "cursor-default",
        isSelected && cat.found ? "bg-primary/5 hover:bg-primary/8" : cat.found ? "hover:bg-secondary/20" : "opacity-30"
      )}
      onClick={() => cat.found && onToggle()}
      data-testid={`row-cleaner-${cat.id}`}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected && cat.found}
        disabled={!cat.found}
        onCheckedChange={() => cat.found && onToggle()}
        className="shrink-0 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        data-testid={`checkbox-cleaner-${cat.id}`}
      />

      {/* Icon */}
      <div className={cn(
        "p-1.5 rounded-md shrink-0 transition-colors",
        isSelected && cat.found ? cfg.bgColor : "bg-secondary/30"
      )}>
        <Icon className={cn("h-3 w-3", isSelected && cat.found ? cfg.color : "text-muted-foreground/40")} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-foreground leading-none">{cat.name}</span>
          {!cat.found && <span className="text-[10px] text-muted-foreground/35 font-mono">Nothing found</span>}
          {cat.autoSelect === false && cat.found && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 leading-none shrink-0">
              <Info className="h-2.5 w-2.5" />
              Review
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/55 mt-0.5 leading-relaxed line-clamp-1">{cat.description}</p>
        {cat.warnNote && cat.found && (
          <p className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed line-clamp-1">{cat.warnNote}</p>
        )}
        {cat.found && (
          <div className="mt-1.5 h-0.5 w-full rounded-full bg-secondary/50 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", isSelected ? "bg-primary" : "bg-secondary/50")}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </div>

      {/* Size + count */}
      <div className="text-right shrink-0 ml-3 min-w-[64px]">
        <p className={cn("text-[12px] font-bold font-mono", isSelected && cat.found ? cfg.color : "text-muted-foreground/35")}>
          {cat.found ? cat.sizeHuman : "—"}
        </p>
        {cat.found && (
          <p className="text-[9px] text-muted-foreground/35 mt-0.5 font-mono">
            {cat.fileCount.toLocaleString()} files
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CleanerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PageState>("idle");
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const [activeGroup, setActiveGroup] = useState<GroupId>("system");

  const { data: cleanHistory } = useQuery({
    queryKey: ["/api/cleaner/history"],
    queryFn: getCleaningHistory,
  });

  const scanMutation = useMutation({
    mutationFn: () => {
      setScanProgress(0);
      setScanStep(0);
      const stepInterval = setInterval(() => {
        setScanStep((s) => (s < SCAN_STEPS.length - 1 ? s + 1 : s));
      }, 500);
      const progressInterval = setInterval(() => {
        setScanProgress((p) => {
          if (p >= 90) { clearInterval(progressInterval); return 90; }
          return p + Math.random() * 7;
        });
      }, 250);
      return scanCleaner().finally(() => {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        setScanProgress(100);
        setScanStep(SCAN_STEPS.length - 1);
      });
    },
    onSuccess: (data) => {
      setScanData(data);
      const foundIds = new Set(
        data.categories.filter((c) => c.found && c.autoSelect !== false && c.installed).map((c) => c.id)
      );
      setSelected(foundIds);
      // Auto-select first group that has found items
      const grouped = groupCategories(data.categories);
      const firstFound = GROUP_ORDER.find((g) => grouped[g]?.some((c) => c.found));
      setActiveGroup(firstFound ?? "system");
      setState("scanned");
    },
    onError: () => {
      setState("idle");
      toast({ variant: "destructive", title: "Scan Failed", description: "Could not scan for junk files." });
    },
  });

  const cleanMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      setCleanProgress(0);
      const interval = setInterval(() => {
        setCleanProgress((p) => {
          if (p >= 85) { clearInterval(interval); return 85; }
          return p + Math.random() * 8;
        });
      }, 150);
      const result = await cleanCategories(ids);
      clearInterval(interval);
      setCleanProgress(100);
      return result;
    },
    onSuccess: (data) => {
      setCleanResult(data);
      setState("done");
      if (data.freed > 0) queryClient.invalidateQueries({ queryKey: ["/api/cleaner/history"] });
    },
    onError: () => {
      setState("scanned");
      toast({ variant: "destructive", title: "Clean Failed", description: "An error occurred while cleaning." });
    },
  });

  const handleScan = () => { setState("scanning"); scanMutation.mutate(); };
  const handleClean = () => {
    if (selected.size === 0) return;
    setState("cleaning");
    cleanMutation.mutate(Array.from(selected));
  };
  const handleReset = () => {
    setState("idle"); setScanData(null); setSelected(new Set());
    setCleanResult(null); setCleanProgress(0); setScanProgress(0); setScanStep(0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupId: GroupId, cats: ScanCategory[]) => {
    const groupIds = cats.filter((c) => c.found).map((c) => c.id);
    const allSelected = groupIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) groupIds.forEach((id) => next.delete(id));
      else groupIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAll = (cats: ScanCategory[] | undefined) => {
    if (!cats) return;
    setSelected((prev) => {
      const next = new Set(prev);
      cats.filter((c) => c.found).forEach((c) => next.add(c.id));
      return next;
    });
  };
  const deselectAll = (cats: ScanCategory[] | undefined) => {
    if (!cats) return;
    setSelected((prev) => {
      const next = new Set(prev);
      cats.forEach((c) => next.delete(c.id));
      return next;
    });
  };

  const selectedSize = scanData
    ? scanData.categories.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.size, 0)
    : 0;

  const hasHistory = cleanHistory && cleanHistory.entries.length > 0;

  return (
    <div className="space-y-4 pb-8 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            PC <span className="text-primary">Cleaner</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Smart detection — only shows apps you actually have installed
          </p>
        </div>
        {hasHistory && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-semibold">Last cleaned</p>
            <p className="text-lg font-black text-primary font-mono leading-tight">{cleanHistory.entries[0].freedHuman}</p>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── IDLE ─────────────────────────────────────────────────────────── */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 55% at 50% 50%, hsl(var(--primary) / 0.06) 0%, transparent 100%)" }} />
              <div className="relative space-y-5">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ScanLine className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Ready to Scan</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Scans 8 categories with smart detection — only shows apps you have installed.
                  </p>
                </div>
                <Button onClick={handleScan} data-testid="button-scan-now" className="h-10 px-8 bg-primary text-white font-bold text-sm shadow-lg" style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.3)" }}>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Now
                </Button>
              </div>
            </div>

            {/* 8-tile preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GROUP_ORDER.map((groupId, i) => {
                const cfg = GROUP_CONFIG[groupId];
                const Icon = cfg.icon;
                return (
                  <motion.div key={groupId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-border transition-all duration-150">
                    <div className={cn("p-1.5 rounded-lg shrink-0", cfg.bgColor)}>
                      <Icon className={cn("h-3 w-3", cfg.color)} />
                    </div>
                    <p className="text-[11px] font-semibold text-foreground/80 leading-tight">{cfg.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {hasHistory && (() => {
              const last = cleanHistory.entries[0];
              return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card" data-testid="row-history-0">
                  <div className="p-2 rounded-lg bg-green-500/10 shrink-0"><History className="h-4 w-4 text-green-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">Last cleaned</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatHistoryDate(last.date)} &middot; {last.count} {last.count === 1 ? "category" : "categories"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-black font-mono text-green-400">{last.freedHuman}</p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">freed</p>
                  </div>
                </motion.div>
              );
            })()}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex items-start gap-2.5 p-3 rounded-lg border border-border/40 bg-secondary/20">
              <ShieldCheck className="h-3.5 w-3.5 text-green-400/70 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                All categories are safe to clean. No personal files, documents, photos, or important system files are ever touched — only temporary, cache, and log files are removed.
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ── SCANNING ──────────────────────────────────────────────────────── */}
        {state === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="p-10 text-center space-y-6 relative">
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 30%, hsl(var(--primary) / 0.05) 0%, transparent 100%)" }} />
                <div className="relative space-y-5">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Scanning Your System...</p>
                    <p className="text-xs text-muted-foreground mt-1">Analysing {SCAN_STEPS.length} categories across all junk types</p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground/60">
                      <span>Scanning</span>
                      <span className="text-primary font-semibold">{Math.round(scanProgress)}%</span>
                    </div>
                    <Progress value={scanProgress} className="h-1.5 bg-secondary [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-200" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={scanStep} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 text-primary/60 animate-spin shrink-0" />
                      <span className="text-[11px] text-muted-foreground/70 font-medium">{SCAN_STEPS[scanStep]}</span>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SCANNED — two-panel layout ─────────────────────────────────────── */}
        {state === "scanned" && scanData && (() => {
          const grouped = groupCategories(scanData.categories);
          const activeCats = grouped[activeGroup] ?? [];
          const cfg = GROUP_CONFIG[activeGroup];
          const GroupIcon = cfg.icon;

          // Active group stats
          const activeTotal = activeCats.reduce((s, c) => s + c.size, 0);
          const activeSelected = activeCats.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.size, 0);
          const activeAllSelected = activeCats.filter((c) => c.found).length > 0 &&
            activeCats.filter((c) => c.found).every((c) => selected.has(c.id));
          const activeSomeSelected = activeCats.some((c) => selected.has(c.id));

          return (
            <motion.div key="scanned" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

              {/* Top summary bar */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      Found <span className="text-primary">{scanData.totalSizeHuman}</span> of junk
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {scanData.totalCount.toLocaleString()} files
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSelected(new Set(scanData.categories.filter((c) => c.found && c.installed).map((c) => c.id)));
                  }} className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" data-testid="button-select-all">
                    <CheckSquare className="h-3 w-3" /> All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" data-testid="button-deselect-all">
                    <Square className="h-3 w-3" /> None
                  </Button>
                </div>
              </div>

              {/* Two-panel layout */}
              <div className="flex gap-3" style={{ minHeight: "460px" }}>

                {/* ── LEFT SIDEBAR: category list ─────────────────────────── */}
                <div className="w-48 shrink-0 rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Categories</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {GROUP_ORDER.map((groupId) => {
                      const cats = grouped[groupId] ?? [];
                      const gcfg = GROUP_CONFIG[groupId];
                      const GIcon = gcfg.icon;
                      const groupTotal = cats.reduce((s, c) => s + c.size, 0);
                      const hasFound = cats.some((c) => c.found);
                      const someSelected = cats.some((c) => selected.has(c.id));
                      const isActive = activeGroup === groupId;

                      return (
                        <button
                          key={groupId}
                          className={cn(
                            "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all duration-150 border-l-2",
                            isActive
                              ? cn("border-l-primary bg-primary/8")
                              : "border-l-transparent hover:bg-secondary/20"
                          )}
                          onClick={() => setActiveGroup(groupId)}
                          data-testid={`sidebar-group-${groupId}`}
                        >
                          {/* Status dot */}
                          <div className="mt-0.5 shrink-0">
                            {hasFound ? (
                              <div className={cn("w-2 h-2 rounded-full", someSelected ? "bg-primary" : gcfg.color.replace("text-", "bg-"))} />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[11px] font-semibold leading-tight truncate", isActive ? "text-foreground" : "text-foreground/70")}>
                              {gcfg.label}
                            </p>
                            <p className={cn("text-[10px] mt-0.5 font-mono font-bold", hasFound ? gcfg.color : "text-muted-foreground/35")}>
                              {hasFound ? fmtSizeLocal(groupTotal) : "Clean"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── RIGHT PANEL: sub-items ──────────────────────────────── */}
                <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                  {/* Right panel header */}
                  <div className={cn("flex items-center justify-between px-4 py-3 border-b border-border/50", cfg.activeBg)}>
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", cfg.bgColor)}>
                        <GroupIcon className={cn("h-4 w-4", cfg.color)} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-foreground">{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Total: <span className={cn("font-bold", cfg.color)}>{fmtSizeLocal(activeTotal)}</span>
                          {activeSelected > 0 && (
                            <> &nbsp;·&nbsp; Selected: <span className="font-bold text-primary">{fmtSizeLocal(activeSelected)}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Group select/deselect */}
                    {activeCats.filter((c) => c.found).length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => selectAll(activeCats)}
                          className="text-[10px] font-semibold px-2 py-1 rounded border border-border/50 text-muted-foreground/70 hover:text-foreground hover:border-border transition-colors"
                        >
                          Select all
                        </button>
                        <button
                          onClick={() => deselectAll(activeCats)}
                          className="text-[10px] font-semibold px-2 py-1 rounded border border-border/50 text-muted-foreground/70 hover:text-foreground hover:border-border transition-colors"
                        >
                          Deselect
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-item rows */}
                  <div className="flex-1 overflow-y-auto">
                    {activeCats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                        <div className={cn("p-4 rounded-2xl", cfg.bgColor)}>
                          <GroupIcon className={cn("h-8 w-8 opacity-40", cfg.color)} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground/50">No apps detected</p>
                          <p className="text-[11px] text-muted-foreground/40 mt-1">None of the apps in this category are installed on your PC</p>
                        </div>
                      </div>
                    ) : activeCats.filter((c) => c.found).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                        <div className={cn("p-4 rounded-2xl", cfg.bgColor)}>
                          <GroupIcon className={cn("h-8 w-8 opacity-40", cfg.color)} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground/50">All clean!</p>
                          <p className="text-[11px] text-muted-foreground/40 mt-1">No junk found in this category</p>
                        </div>
                        {/* Still show items at 0 so user can see what was checked */}
                        <div className="w-full border-t border-border/30 mt-2">
                          {activeCats.map((cat) => (
                            <SubItemRow key={cat.id} cat={cat} isSelected={false} cfg={cfg} totalSize={activeTotal} onToggle={() => toggleSelect(cat.id)} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      activeCats.map((cat) => (
                        <SubItemRow key={cat.id} cat={cat} isSelected={selected.has(cat.id)} cfg={cfg} totalSize={activeTotal} onToggle={() => toggleSelect(cat.id)} />
                      ))
                    )}
                  </div>

                  {/* Privacy warning inside right panel */}
                  {activeGroup === "privacy" && (
                    <div className="flex items-start gap-2.5 mx-4 mb-3 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <AlertCircle className="h-3 w-3 text-amber-400/80 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-400/80 leading-relaxed">
                        Cleaning history & cookies will log you out of websites. Close your browser first.
                      </p>
                    </div>
                  )}
                  {activeGroup === "downloads" && (
                    <div className="flex items-start gap-2.5 mx-4 mb-3 p-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5">
                      <AlertCircle className="h-3 w-3 text-orange-400/80 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-orange-400/80 leading-relaxed">
                        Review carefully — these are files in your Downloads folder. Only installer & archive formats are scanned.
                      </p>
                    </div>
                  )}
                  {activeGroup === "backup" && (
                    <div className="flex items-start gap-2.5 mx-4 mb-3 p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
                      <AlertCircle className="h-3 w-3 text-rose-400/80 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-rose-400/80 leading-relaxed">
                        Backup files cannot be recovered after deletion. Only clean if you no longer need them.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clean button row */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  {selected.size > 0 ? (
                    <>
                      <span className="text-primary font-bold">{selected.size}</span>{" "}
                      {selected.size === 1 ? "category" : "categories"} selected
                    </>
                  ) : (
                    "Select at least one category to clean"
                  )}
                </div>
                <Button onClick={handleClean} disabled={selected.size === 0} data-testid="button-clean-selected"
                  className="h-9 px-6 bg-primary text-white font-bold text-sm disabled:opacity-30"
                  style={selected.size > 0 ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.25)" } : {}}>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Clean Selected
                </Button>
              </div>
            </motion.div>
          );
        })()}

        {/* ── CLEANING ──────────────────────────────────────────────────────── */}
        {state === "cleaning" && (
          <motion.div key="cleaning" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="p-10 text-center space-y-6 relative">
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 30%, hsl(var(--primary) / 0.05) 0%, transparent 100%)" }} />
                <div className="relative space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Cleaning in Progress...</p>
                    <p className="text-xs text-muted-foreground mt-1">Removing {selected.size} {selected.size === 1 ? "category" : "categories"} of junk files</p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground/60">
                      <span>Deleting files</span>
                      <span className="text-primary font-semibold">{Math.round(cleanProgress)}%</span>
                    </div>
                    <Progress value={cleanProgress} className="h-1.5 bg-secondary [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-200" />
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────────── */}
        {state === "done" && cleanResult && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-green-500/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />
              <div className="p-10 text-center space-y-6 relative">
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 55% at 50% 30%, rgb(34 197 94 / 0.04) 0%, transparent 100%)" }} />
                <div className="relative space-y-4">
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </motion.div>
                  <div>
                    <p className="text-base font-bold text-foreground">All Clean!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cleaned {cleanResult.cleaned.length} {cleanResult.cleaned.length === 1 ? "category" : "categories"} successfully
                    </p>
                  </div>
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                    className="mx-auto px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 inline-block">
                    <p className="text-[10px] text-green-400/60 uppercase tracking-wider font-semibold mb-1">Freed this clean</p>
                    <p className="text-3xl font-black text-green-400 font-mono">{cleanResult.freedHuman}</p>
                  </motion.div>
                  {cleanResult.cleaned.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {cleanResult.cleaned.map((name) => (
                        <span key={name} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">{name}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-center gap-2 pt-2">
                    <Button onClick={handleScan} variant="ghost" className="h-9 px-5 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border/50 hover:border-border" data-testid="button-scan-again">
                      <ScanLine className="mr-2 h-3.5 w-3.5" /> Scan Again
                    </Button>
                    <Button onClick={handleReset} className="h-9 px-6 bg-green-600 hover:bg-green-600/90 text-white font-bold text-sm" data-testid="button-done-complete">
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Done
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
