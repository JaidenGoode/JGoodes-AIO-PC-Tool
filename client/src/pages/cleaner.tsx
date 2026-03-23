import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Zap, Package, FileText, Image as ImageIcon,
  Globe, HardDrive, RotateCcw, ScanLine, Sparkles,
  CheckSquare, Square, Loader2, CheckCircle2, AlertCircle,
  Cpu, RefreshCw, Database, Layers, Archive, History,
  MessageSquare, Gamepad2, Download, Info, ShieldCheck,
  Monitor, Music, Video, Settings, Lock, Shield,
  ChevronDown, ChevronRight, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  scanCleaner, cleanCategories, getCleaningHistory,
} from "@/lib/api";
import type { ScanCategory, ScanResult, CleanResult } from "@/lib/api";
import { cn } from "@/lib/utils";

type PageState = "idle" | "scanning" | "scanned" | "cleaning" | "done";

// ── Group configuration ──────────────────────────────────────────────────────
const GROUP_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  system: {
    label: "System Junk",
    icon: Monitor,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
    description: "Windows temp files, logs, caches, and dumps",
  },
  apps: {
    label: "App Junk",
    icon: Package,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/20",
    description: "Discord, Spotify, Teams, Slack, OBS, Zoom, Roblox",
  },
  games: {
    label: "Game Junk",
    icon: Gamepad2,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/20",
    description: "Steam, Epic, GOG, EA, Ubisoft, Battle.net cache & logs",
  },
  browser: {
    label: "Browser Cache",
    icon: Globe,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/20",
    description: "Chrome, Edge, Firefox, Opera GX, Brave cache",
  },
  privacy: {
    label: "Browser Privacy",
    icon: Shield,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
    description: "History, cookies, and login data — close browser first",
  },
  recycle: {
    label: "Recycle Bin",
    icon: Archive,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/20",
    description: "Files deleted but not yet permanently removed",
  },
};

const GROUP_ORDER = ["system", "apps", "games", "browser", "privacy", "recycle"] as const;

const CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  temp: Trash2, prefetch: Cpu, wupdate: RefreshCw, deliveryopt: Download,
  errorreports: AlertCircle, logs: FileText, dumpfiles: Database,
  thumbnails: ImageIcon, shadercache: Layers,
  discord: MessageSquare, spotify: Music, teams: Users, zoom: Video,
  slack: MessageSquare, obs: Video, roblox: Gamepad2,
  steam: Gamepad2, epic: Gamepad2, gog: Gamepad2, ea: Gamepad2,
  ubisoft: Gamepad2, battlenet: Gamepad2,
  chrome: Globe, edge: Globe, firefox: Globe, operagx: Globe, brave: Globe,
  chromeprivacy: Lock, edgeprivacy: Lock, firefoxprivacy: Lock, operagxprivacy: Lock,
  recycle: Archive,
};

const SCAN_STEPS = [
  "Temp files & user cache",
  "Windows prefetch data",
  "Delivery Optimization cache",
  "Discord & Spotify cache",
  "Steam & Epic launcher cache",
  "GOG, EA, Ubisoft cache",
  "Chrome & Edge cache",
  "Firefox & Opera GX cache",
  "Browser privacy data",
  "Windows Update downloads",
  "System log files",
  "DirectX shader cache",
  "Memory dump files",
  "Recycle Bin contents",
];

function UsageBar({ pct, active = true }: { pct: number; active?: boolean }) {
  return (
    <div className="h-1 w-full rounded-full bg-secondary/60 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          active ? "progress-gradient-fill" : "bg-secondary/50"
        )}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

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

// Groups categories, filtering out non-installed app/game/browser/privacy items
function groupCategories(categories: ScanCategory[]) {
  const grouped: Record<string, ScanCategory[]> = {};
  for (const cat of categories) {
    // For non-system groups, hide if app is not installed
    if (cat.group !== "system" && cat.group !== "recycle" && !cat.installed) continue;
    if (!grouped[cat.group]) grouped[cat.group] = [];
    grouped[cat.group].push(cat);
  }
  return grouped;
}

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
          return p + Math.random() * 8;
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
      if (data.freed > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/cleaner/history"] });
      }
    },
    onError: () => {
      setState("scanned");
      toast({ variant: "destructive", title: "Clean Failed", description: "An error occurred while cleaning." });
    },
  });

  const handleScan = () => {
    setState("scanning");
    scanMutation.mutate();
  };

  const handleClean = () => {
    if (selected.size === 0) return;
    setState("cleaning");
    cleanMutation.mutate(Array.from(selected));
  };

  const handleReset = () => {
    setState("idle");
    setScanData(null);
    setSelected(new Set());
    setCleanResult(null);
    setCleanProgress(0);
    setScanProgress(0);
    setScanStep(0);
    setCollapsedGroups(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupId: string, cats: ScanCategory[]) => {
    const groupIds = cats.filter((c) => c.found).map((c) => c.id);
    const allSelected = groupIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleCollapseGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const selectAll = () => {
    if (!scanData) return;
    setSelected(new Set(scanData.categories.filter((c) => c.found && c.installed).map((c) => c.id)));
  };

  const deselectAll = () => setSelected(new Set());

  const selectedSize = scanData
    ? scanData.categories
        .filter((c) => selected.has(c.id))
        .reduce((s, c) => s + c.size, 0)
    : 0;

  const hasHistory = cleanHistory && cleanHistory.entries.length > 0;

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
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
            <p className="text-lg font-black text-primary font-mono leading-tight">
              {cleanHistory.entries[0].freedHuman}
            </p>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── IDLE ─────────────────────────────────────────────────────────── */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Hero panel */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 55% 55% at 50% 50%, hsl(var(--primary) / 0.06) 0%, transparent 100%)",
                }}
              />
              <div className="relative space-y-5">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ScanLine className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Ready to Scan</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Scans 6 categories for temporary files, cache, logs, and other safe-to-remove junk.
                  </p>
                </div>
                <Button
                  onClick={handleScan}
                  data-testid="button-scan-now"
                  className="h-10 px-8 bg-primary text-white font-bold text-sm shadow-lg"
                  style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.3)" }}
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Now
                </Button>
              </div>
            </div>

            {/* Category preview — 6 group tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GROUP_ORDER.map((groupId, i) => {
                const cfg = GROUP_CONFIG[groupId];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={groupId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-border transition-all duration-150"
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0", cfg.bgColor)}>
                      <Icon className={cn("h-3 w-3", cfg.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground/80 leading-none">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{cfg.description.split(" — ")[0]}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Last Clean Summary */}
            {hasHistory && (() => {
              const last = cleanHistory.entries[0];
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card"
                  data-testid="row-history-0"
                >
                  <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                    <History className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">Last cleaned</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      {formatHistoryDate(last.date)} &middot; {last.count} {last.count === 1 ? "category" : "categories"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-black font-mono text-green-400">{last.freedHuman}</p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">freed</p>
                  </div>
                </motion.div>
              );
            })()}

            {/* Safety notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-start gap-2.5 p-3 rounded-lg border border-border/40 bg-secondary/20"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-green-400/70 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                All categories are safe to clean. No personal files, documents, photos, or important system
                files are ever touched — only temporary, cache, and log files are removed.
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ── SCANNING ──────────────────────────────────────────────────────── */}
        {state === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="p-10 text-center space-y-6 relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 70% 70% at 50% 30%, hsl(var(--primary) / 0.05) 0%, transparent 100%)",
                  }}
                />
                <div className="relative space-y-5">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Scanning Your System...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Analysing temp files, cache, logs and junk across {SCAN_STEPS.length} categories
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground/60">
                      <span>Scanning</span>
                      <span className="text-primary font-semibold">{Math.round(scanProgress)}%</span>
                    </div>
                    <Progress
                      value={scanProgress}
                      className="h-1.5 bg-secondary [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-200"
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={scanStep}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center gap-1.5"
                    >
                      <Loader2 className="h-3 w-3 text-primary/60 animate-spin shrink-0" />
                      <span className="text-[11px] text-muted-foreground/70 font-medium">
                        {SCAN_STEPS[scanStep]}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SCANNED — grouped results ──────────────────────────────────────── */}
        {state === "scanned" && scanData && (() => {
          const grouped = groupCategories(scanData.categories);
          const visibleCats = Object.values(grouped).flat();
          const foundCount = visibleCats.filter((c) => c.found).length;

          return (
            <motion.div
              key="scanned"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Summary bar */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/15">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Found{" "}
                      <span className="text-primary">{scanData.totalSizeHuman}</span>{" "}
                      of junk
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {scanData.totalCount.toLocaleString()} files across {foundCount} categories
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAll}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    data-testid="button-select-all"
                  >
                    <CheckSquare className="h-3 w-3" />
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={deselectAll}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    data-testid="button-deselect-all"
                  >
                    <Square className="h-3 w-3" />
                    None
                  </Button>
                </div>
              </div>

              {/* Grouped category sections */}
              <div className="space-y-3">
                {GROUP_ORDER.map((groupId) => {
                  const cats = grouped[groupId];
                  if (!cats || cats.length === 0) return null;
                  const cfg = GROUP_CONFIG[groupId];
                  const GroupIcon = cfg.icon;
                  const isCollapsed = collapsedGroups.has(groupId);
                  const groupFoundIds = cats.filter((c) => c.found).map((c) => c.id);
                  const groupAllSelected = groupFoundIds.length > 0 && groupFoundIds.every((id) => selected.has(id));
                  const groupSomeSelected = groupFoundIds.some((id) => selected.has(id));
                  const groupTotalSize = cats.reduce((s, c) => s + c.size, 0);
                  const groupSelectedSize = cats.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.size, 0);

                  return (
                    <motion.div
                      key={groupId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {/* Group header */}
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 border-b border-border/50 cursor-pointer select-none hover:bg-secondary/20 transition-colors",
                          groupSomeSelected && "bg-secondary/10"
                        )}
                        onClick={() => toggleCollapseGroup(groupId)}
                        data-testid={`group-header-${groupId}`}
                      >
                        <div className={cn("p-1.5 rounded-lg shrink-0", cfg.bgColor)}>
                          <GroupIcon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-foreground">{cfg.label}</span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {cats.filter((c) => c.found).length}/{cats.length} found
                            </span>
                            {groupTotalSize > 0 && (
                              <span className={cn("text-[11px] font-bold font-mono ml-auto", cfg.color)}>
                                {fmtSizeLocal(groupSelectedSize > 0 ? groupSelectedSize : groupTotalSize)}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{cfg.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {groupFoundIds.length > 0 && (
                            <button
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors",
                                groupAllSelected
                                  ? cn(cfg.bgColor, cfg.color, cfg.borderColor)
                                  : "border-border/50 text-muted-foreground/60 hover:border-border hover:text-foreground"
                              )}
                              onClick={(e) => { e.stopPropagation(); toggleGroup(groupId, cats); }}
                              data-testid={`button-group-toggle-${groupId}`}
                            >
                              {groupAllSelected ? "Deselect" : "Select all"}
                            </button>
                          )}
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                          }
                        </div>
                      </div>

                      {/* Category rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-border/30">
                          {cats.map((cat, i) => {
                            const Icon = CAT_ICONS[cat.id] || Trash2;
                            const isSelected = selected.has(cat.id);
                            const pct = scanData.totalSize > 0 ? (cat.size / scanData.totalSize) * 100 : 0;
                            return (
                              <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 transition-all duration-150 group",
                                  cat.found ? "cursor-pointer" : "cursor-default",
                                  isSelected && cat.found
                                    ? "bg-primary/5 hover:bg-primary/8"
                                    : cat.found
                                    ? "hover:bg-secondary/20"
                                    : "opacity-30"
                                )}
                                onClick={() => cat.found && toggleSelect(cat.id)}
                                data-testid={`row-cleaner-${cat.id}`}
                              >
                                <Checkbox
                                  checked={isSelected && cat.found}
                                  disabled={!cat.found}
                                  onCheckedChange={() => cat.found && toggleSelect(cat.id)}
                                  className="shrink-0 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  data-testid={`checkbox-cleaner-${cat.id}`}
                                />
                                <div className={cn(
                                  "p-1.5 rounded-md shrink-0 transition-colors",
                                  isSelected && cat.found ? cfg.bgColor : "bg-secondary/30"
                                )}>
                                  <Icon className={cn(
                                    "h-3 w-3 transition-colors",
                                    isSelected && cat.found ? cfg.color : "text-muted-foreground/40"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px] font-semibold text-foreground leading-none">{cat.name}</span>
                                    {!cat.found && (
                                      <span className="text-[10px] text-muted-foreground/35 font-mono">Nothing found</span>
                                    )}
                                    {cat.autoSelect === false && cat.found && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 leading-none shrink-0">
                                        <Info className="h-2.5 w-2.5" />
                                        Manual
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">{cat.description}</p>
                                  {cat.warnNote && cat.found && (
                                    <p className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">{cat.warnNote}</p>
                                  )}
                                  {cat.found && (
                                    <div className="mt-1.5">
                                      <UsageBar pct={pct} active={isSelected} />
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0 ml-2 min-w-[52px]">
                                  <p className={cn(
                                    "text-[12px] font-bold font-mono",
                                    isSelected && cat.found ? "text-primary" : "text-muted-foreground/35"
                                  )}>
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
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Privacy warning */}
              {grouped["privacy"] && grouped["privacy"].length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400/80 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    <span className="font-semibold">Browser Privacy:</span> History & cookie cleaning removes login sessions — you will need to sign back in to websites. Close your browser completely before cleaning.
                  </p>
                </div>
              )}

              {/* Clean button row */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  {selected.size > 0 ? (
                    <>
                      <span className="text-primary font-bold">{selected.size}</span>{" "}
                      {selected.size === 1 ? "category" : "categories"} selected —{" "}
                      <span className="text-foreground font-semibold">{fmtSizeLocal(selectedSize)}</span> will be freed
                    </>
                  ) : (
                    "Select at least one category to clean"
                  )}
                </div>
                <Button
                  onClick={handleClean}
                  disabled={selected.size === 0}
                  data-testid="button-clean-selected"
                  className="h-9 px-6 bg-primary text-white font-bold text-sm disabled:opacity-30"
                  style={selected.size > 0 ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.25)" } : {}}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Clean Selected
                </Button>
              </div>
            </motion.div>
          );
        })()}

        {/* ── CLEANING ──────────────────────────────────────────────────────── */}
        {state === "cleaning" && (
          <motion.div
            key="cleaning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="p-10 text-center space-y-6 relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 70% 70% at 50% 30%, hsl(var(--primary) / 0.05) 0%, transparent 100%)",
                  }}
                />
                <div className="relative space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Cleaning in Progress...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Removing {selected.size} {selected.size === 1 ? "category" : "categories"} of junk files
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground/60">
                      <span>Deleting files</span>
                      <span className="text-primary font-semibold">{Math.round(cleanProgress)}%</span>
                    </div>
                    <Progress
                      value={cleanProgress}
                      className="h-1.5 bg-secondary [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-200"
                    />
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────────── */}
        {state === "done" && cleanResult && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl border border-green-500/20 bg-card overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />
              <div className="p-10 text-center space-y-6 relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 55% 55% at 50% 30%, rgb(34 197 94 / 0.04) 0%, transparent 100%)",
                  }}
                />
                <div className="relative space-y-4">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </motion.div>

                  <div>
                    <p className="text-base font-bold text-foreground">All Clean!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cleaned {cleanResult.cleaned.length} {cleanResult.cleaned.length === 1 ? "category" : "categories"} successfully
                    </p>
                  </div>

                  {/* Freed amount — THIS RUN ONLY */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                    className="mx-auto px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 inline-block"
                  >
                    <p className="text-[10px] text-green-400/60 uppercase tracking-wider font-semibold mb-1">Freed this clean</p>
                    <p className="text-3xl font-black text-green-400 font-mono">{cleanResult.freedHuman}</p>
                  </motion.div>

                  {cleanResult.cleaned.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {cleanResult.cleaned.map((name) => (
                        <span
                          key={name}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-center gap-2 pt-2">
                    <Button
                      onClick={handleScan}
                      variant="ghost"
                      className="h-9 px-5 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border/50 hover:border-border"
                      data-testid="button-scan-again"
                    >
                      <ScanLine className="mr-2 h-3.5 w-3.5" />
                      Scan Again
                    </Button>
                    <Button
                      onClick={handleReset}
                      className="h-9 px-6 bg-green-600 hover:bg-green-600/90 text-white font-bold text-sm"
                      data-testid="button-done-complete"
                    >
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                      Done
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
