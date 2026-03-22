import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Zap, Package, FileText, Image as ImageIcon,
  Globe, HardDrive, RotateCcw, ScanLine, Sparkles,
  CheckSquare, Square, Loader2, CheckCircle2, AlertCircle,
  Cpu, RefreshCw, Database, Layers, Archive, History,
  MessageSquare, Gamepad2, Download, Info, ShieldCheck,
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

const CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  temp: Trash2,
  npm: Package,
  logs: FileText,
  cache: Zap,
  thumbnails: ImageIcon,
  browser: Globe,
  trash: RotateCcw,
  systemcache: HardDrive,
  prefetch: Cpu,
  wupdate: RefreshCw,
  errorreports: AlertCircle,
  dumpfiles: Database,
  shadercache: Layers,
  recycle: Archive,
  discord: MessageSquare,
  gamelaunchers: Gamepad2,
  deliveryopt: Download,
};

const SCAN_STEPS = [
  "Temp files & user cache",
  "Windows prefetch data",
  "Browser cache files",
  "Discord app cache",
  "Steam & Epic launcher cache",
  "Windows Update downloads",
  "System log files",
  "DirectX shader cache",
  "Memory dump files",
  "Thumbnail cache",
  "Error report archives",
  "Delivery optimization",
  "Recycle Bin contents",
];

function UsageBar({ pct, active = true }: { pct: number; active?: boolean }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
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
      }, 400);
      const progressInterval = setInterval(() => {
        setScanProgress((p) => {
          if (p >= 90) { clearInterval(progressInterval); return 90; }
          return p + Math.random() * 10;
        });
      }, 220);
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
        data.categories.filter((c) => c.found && c.autoSelect !== false).map((c) => c.id)
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
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!scanData) return;
    setSelected(new Set(scanData.categories.filter((c) => c.found).map((c) => c.id)));
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
            Scan and remove junk files safely — no personal files ever touched
          </p>
        </div>
        {hasHistory && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-semibold">Total freed</p>
            <p className="text-lg font-black text-primary font-mono leading-tight">
              {cleanHistory.totalFreedHuman}
            </p>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── IDLE ───────────────────────────────────────────────── */}
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
                    Scans 13 categories for temporary files, cache, logs, and other safe-to-remove junk.
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

            {/* Category preview — 8 tiles, 2 perfect rows of 4 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Trash2,        label: "Temp Files",       sub: "System & user temp" },
                { icon: Globe,         label: "Browser Cache",    sub: "Chrome, Edge, Opera GX" },
                { icon: Gamepad2,      label: "Game Launchers",   sub: "Steam & Epic cache" },
                { icon: Layers,        label: "Shader Cache",     sub: "GPU & DirectX shaders" },
                { icon: MessageSquare, label: "Discord Cache",    sub: "App & GPU cache" },
                { icon: RefreshCw,     label: "Windows Update",   sub: "Downloaded update files" },
                { icon: FileText,      label: "Log Files",        sub: "CBS, DISM, Panther" },
                { icon: Archive,       label: "Recycle Bin",      sub: "All drives" },
              ].map(({ icon: Icon, label, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-border transition-all duration-150"
                >
                  <div className="p-1.5 rounded-lg bg-primary/8 shrink-0">
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground/80 leading-none">{label}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{sub}</p>
                  </div>
                </motion.div>
              ))}
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
                  <div className="h-8 w-px bg-border/60 shrink-0" />
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-black font-mono text-primary">{cleanHistory.totalFreedHuman}</p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">total freed</p>
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

        {/* ── SCANNING ────────────────────────────────────────────── */}
        {state === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              {/* Top glow stripe */}
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

                  {/* Progress */}
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

                  {/* Animated step label */}
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

                  {/* Bouncing dots */}
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

        {/* ── SCANNED — results with checkboxes ───────────────────── */}
        {state === "scanned" && scanData && (
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
                    {scanData.totalCount.toLocaleString()} files across {scanData.categories.filter((c) => c.found).length} categories
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

            {/* Category list */}
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
              {scanData.categories.map((cat, i) => {
                const Icon = CAT_ICONS[cat.id] || Trash2;
                const isSelected = selected.has(cat.id);
                const pct = scanData.totalSize > 0 ? (cat.size / scanData.totalSize) * 100 : 0;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025 }}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 transition-all duration-150 group",
                      cat.found ? "cursor-pointer" : "cursor-default",
                      isSelected && cat.found
                        ? "bg-primary/5 hover:bg-primary/8"
                        : cat.found
                        ? "hover:bg-secondary/30"
                        : "opacity-35"
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
                      "p-1.5 rounded-lg shrink-0 transition-colors",
                      isSelected && cat.found ? "bg-primary/15" : "bg-secondary/40"
                    )}>
                      <Icon className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        isSelected && cat.found ? "text-primary" : "text-muted-foreground/50"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-foreground leading-none">{cat.name}</span>
                        {!cat.found && (
                          <span className="text-[10px] text-muted-foreground/40 font-mono">Nothing found</span>
                        )}
                        {cat.autoSelect === false && cat.found && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 leading-none shrink-0">
                            <Info className="h-2.5 w-2.5" />
                            Manual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{cat.description}</p>
                      {cat.warnNote && cat.found && (
                        <p className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">{cat.warnNote}</p>
                      )}
                      {cat.found && (
                        <div className="mt-2">
                          <UsageBar pct={pct} active={isSelected} />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2 min-w-[56px]">
                      <p className={cn(
                        "text-[13px] font-bold font-mono",
                        isSelected && cat.found ? "text-primary" : "text-muted-foreground/40"
                      )}>
                        {cat.found ? cat.sizeHuman : "—"}
                      </p>
                      {cat.found && (
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                          {cat.fileCount.toLocaleString()} files
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Browser safety notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400/80 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                <span className="font-semibold">Tip:</span> Close Chrome, Edge, and Opera GX before cleaning Browser Cache for best results — open browsers may hold cache files in use.
              </p>
            </div>

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
        )}

        {/* ── CLEANING ────────────────────────────────────────────── */}
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

        {/* ── DONE ────────────────────────────────────────────────── */}
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
                      Freed{" "}
                      <span className="text-green-400 font-bold text-sm">{cleanResult.freedHuman}</span>
                      {" "}from {cleanResult.cleaned.length} {cleanResult.cleaned.length === 1 ? "category" : "categories"}
                    </p>
                  </div>

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

                  {cleanHistory && cleanHistory.entries.length > 0 && (
                    <div className="mx-auto px-5 py-3 rounded-xl bg-secondary/40 border border-border/50 inline-block">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-0.5">All time freed</p>
                      <p className="text-2xl font-black text-primary font-mono">{cleanHistory.totalFreedHuman}</p>
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
                      Complete
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
