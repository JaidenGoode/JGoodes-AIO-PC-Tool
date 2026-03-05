import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Wrench, Shield, Zap, SlidersHorizontal,
  AlertTriangle, Ghost, Gamepad2, Globe, Info, CheckCircle2,
  Download, Copy, Check, Terminal, ScanSearch, Loader2,
  Play, X, Clock, Trash2, ChevronRight, RotateCcw, AlertOctagon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTweaks, useUpdateTweak } from "@/hooks/use-tweaks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getTweakCommand, generatePowerShellScript, generateUndoScript } from "@/lib/tweak-commands";
import { detectTweaks, bulkUpdateTweaks } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TWEAK_PRESETS } from "@/lib/tweak-presets";
import { getImpact, type ImpactLevel } from "@/lib/tweak-impacts";
import { getConflict } from "@/lib/tweak-conflicts";

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      runScript: (script: string) => Promise<{ success: boolean; code: number }>;
      onScriptOutput: (callback: (data: { type: string; text?: string; code?: number }) => void) => () => void;
    };
  }
}

const CATEGORIES = ["all", "debloat", "privacy", "performance", "gaming", "system", "browser"] as const;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  performance: Zap,
  privacy: Shield,
  system: SlidersHorizontal,
  debloat: Ghost,
  gaming: Gamepad2,
  browser: Globe,
  all: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  performance: "text-yellow-400",
  privacy: "text-blue-400",
  system: "text-purple-400",
  debloat: "text-orange-400",
  gaming: "text-green-400",
  browser: "text-cyan-400",
  all: "text-primary",
};

function CopyButton({ text, size = "sm" }: { text: string; size?: "xs" | "sm" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 border transition-all duration-150",
        "border-border/40 bg-secondary/60 hover:border-primary/30 hover:bg-primary/8 text-muted-foreground hover:text-primary",
        size === "xs" ? "text-[9.5px]" : "text-[10px]"
      )}
      title="Copy command to clipboard"
      data-testid="button-copy-command"
    >
      {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
      {copied ? "Copied" : "Copy CMD"}
    </button>
  );
}

function formatScannedTime(iso: string): string {
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

export default function Tweaks() {
  const { data: tweaks, isLoading } = useTweaks();
  const updateTweak = useUpdateTweak();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [showRestorePrompt, setShowRestorePrompt] = useState(() => !localStorage.getItem("restore_prompt_shown"));
  const [viewingCmd, setViewingCmd] = useState<{ title: string; cmd: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [scriptOutput, setScriptOutput] = useState<Array<{ type: string; text: string }>>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(() => {
    const ts = localStorage.getItem("tweaks_scanned_at");
    return ts || null;
  });
  const terminalRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [scriptOutput]);

  const detectMutation = useMutation({
    mutationFn: detectTweaks,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
      const now = new Date().toISOString();
      localStorage.setItem("tweaks_scanned", "1");
      localStorage.setItem("tweaks_scanned_at", now);
      setLastScanned(now);
      if (data.total === 0) {
        toast({ title: "Scan complete", description: "Running on non-Windows — no tweaks detected." });
      } else {
        toast({
          title: `Scan complete — ${data.active} tweak${data.active !== 1 ? "s" : ""} detected`,
          description: `Checked ${data.total} tweaks against your system registry. Toggles updated.`,
        });
      }
    },
    onError: () => {
      toast({ title: "Scan failed", description: "Could not read system state. Try running as Administrator.", variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ titles, isActive }: { titles: string[]; isActive: boolean }) =>
      bulkUpdateTweaks(titles, isActive),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
      if (data.updated === 0) {
        toast({ title: vars.isActive ? "Already applied" : "Already cleared", description: "No changes needed." });
      }
    },
    onError: () => {
      toast({ title: "Operation failed", description: "Could not update tweaks.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!localStorage.getItem("tweaks_scanned") && tweaks && !isLoading && !detectMutation.isPending) {
      detectMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweaks, isLoading]);

  const handleClosePrompt = (wantsRestore: boolean) => {
    localStorage.setItem("restore_prompt_shown", "true");
    setShowRestorePrompt(false);
    if (wantsRestore) setLocation("/restore");
  };

  const applyPreset = async (preset: typeof TWEAK_PRESETS[number]) => {
    const titles = preset.id === "all" ? [] : preset.titles;
    const count = preset.id === "all"
      ? tweaks?.length || 0
      : preset.titles.length;
    await bulkMutation.mutateAsync({ titles, isActive: true });
    toast({
      title: `${preset.name} preset applied`,
      description: `Enabled up to ${count} tweaks.`,
    });
  };

  const handleSelectAll = async () => {
    await bulkMutation.mutateAsync({ titles: [], isActive: true });
    toast({ title: "All tweaks enabled", description: `${tweaks?.length || 0} tweaks set to active.` });
  };

  const handleClearAll = async () => {
    setShowClearConfirm(false);
    await bulkMutation.mutateAsync({ titles: [], isActive: false });
    toast({ title: "All tweaks cleared", description: "All tweaks have been disabled." });
  };

  const handleRunInApp = async () => {
    if (!tweaks || !window.electronAPI?.runScript) return;
    const script = generatePowerShellScript(tweaks);
    if (!script) {
      toast({ title: "No active tweaks", description: "Enable some tweaks first.", variant: "destructive" });
      return;
    }
    setScriptOutput([{ type: "info", text: "# JGoode's A.I.O PC Tool — Applying tweaks via PowerShell\n# Running as current process. For full effect, run app as Administrator.\n" }]);
    setIsRunning(true);
    setShowRunDialog(true);

    cleanupRef.current = window.electronAPI.onScriptOutput((data) => {
      if (data.type === "done") {
        setIsRunning(false);
        setScriptOutput((prev) => [
          ...prev,
          {
            type: data.code === 0 ? "success" : "stderr",
            text: data.code === 0
              ? "\n\u2713 Script completed successfully."
              : `\n\u2717 Script exited with code ${data.code}.`,
          },
        ]);
        cleanupRef.current?.();
        cleanupRef.current = null;
      } else if (data.text) {
        setScriptOutput((prev) => [...prev, { type: data.type, text: data.text! }]);
      }
    });

    try {
      await window.electronAPI.runScript(script);
    } catch (err) {
      setIsRunning(false);
      setScriptOutput((prev) => [...prev, { type: "stderr", text: String(err) }]);
      cleanupRef.current?.();
      cleanupRef.current = null;
    }
  };

  const closeRunDialog = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setShowRunDialog(false);
    setScriptOutput([]);
    setIsRunning(false);
  };

  const exportScript = () => {
    if (!tweaks) return;
    const script = generatePowerShellScript(tweaks);
    if (!script) {
      toast({ title: "No active tweaks", description: "Enable some tweaks first, then export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JGoode-AIO-Tweaks.ps1";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUndoScript = () => {
    if (!tweaks) return;
    const script = generateUndoScript(tweaks);
    if (!script) {
      toast({ title: "No tweaks to reverse", description: "Enable some tweaks first, then generate the undo script.", variant: "destructive" });
      return;
    }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JGoode-AIO-Undo.ps1";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Undo script downloaded", description: "Run as Administrator to revert all active tweaks." });
  };

  const filteredTweaks = tweaks?.filter((tweak) => {
    const matchesSearch =
      tweak.title.toLowerCase().includes(search.toLowerCase()) ||
      tweak.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tweak.category.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const activeTweakCount = tweaks?.filter((t) => t.isActive).length || 0;
  const isBulkPending = bulkMutation.isPending;

  return (
    <div className="space-y-5 pb-8">
      {/* Restore prompt dialog */}
      <AlertDialog open={showRestorePrompt} onOpenChange={setShowRestorePrompt}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Create a restore point first?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              We recommend creating a restore point before making changes. This lets you undo any tweaks safely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClosePrompt(false)} data-testid="button-skip-restore">
              Skip
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClosePrompt(true)}
              className="bg-primary text-white"
              data-testid="button-go-restore"
            >
              Create Restore Point
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All confirmation dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Clear all tweaks?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will disable all {tweaks?.length || 0} tweaks. Your Windows registry is not changed — only the toggles in this app are reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive hover:bg-destructive/90 text-white"
              data-testid="button-confirm-clear-all"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Command viewer dialog */}
      <Dialog open={!!viewingCmd} onOpenChange={() => setViewingCmd(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Terminal className="h-4 w-4 text-primary" />
              {viewingCmd?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Run this in PowerShell as Administrator to apply this tweak to your Windows PC.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <pre className="text-[11px] leading-relaxed bg-black/40 border border-border/40 rounded-lg p-4 overflow-x-auto text-green-400 font-mono whitespace-pre-wrap">
              {viewingCmd?.cmd}
            </pre>
            {viewingCmd && (
              <div className="absolute top-2 right-2">
                <CopyButton text={viewingCmd.cmd} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Run in App terminal dialog */}
      <Dialog open={showRunDialog} onOpenChange={closeRunDialog}>
        <DialogContent className="bg-card border-border max-w-2xl" onPointerDownOutside={(e) => isRunning && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Terminal className="h-4 w-4 text-primary" />
              {isRunning ? "Running Tweaks..." : "Script Finished"}
              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1" />}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              PowerShell output — requires Administrator to apply most tweaks.
            </DialogDescription>
          </DialogHeader>
          <div
            ref={terminalRef}
            className="bg-black/70 rounded-lg border border-border/40 h-72 overflow-y-auto p-3.5 font-mono text-[11px] space-y-px"
          >
            {scriptOutput.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "leading-relaxed whitespace-pre-wrap break-words",
                  line.type === "stderr" ? "text-red-400"
                    : line.type === "success" ? "text-green-400 font-semibold"
                    : line.type === "info" ? "text-muted-foreground/60"
                    : "text-green-300"
                )}
              >
                {line.text}
              </div>
            ))}
            {isRunning && <div className="text-primary animate-pulse mt-1">▋</div>}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[10px] text-muted-foreground/40">
              {isRunning ? "Do not close — script is still running" : "Script execution complete"}
            </p>
            <Button
              size="sm"
              onClick={closeRunDialog}
              disabled={isRunning}
              className="h-7 text-xs"
              data-testid="button-close-run-dialog"
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            System <span className="text-primary">Tweaks</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toggle to enable · Export as .ps1 script to apply on Windows
            {activeTweakCount > 0 && (
              <span className="ml-2 text-primary font-semibold">{activeTweakCount} active</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Search tweaks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-secondary border-border/60 focus:border-primary/40"
                data-testid="input-search-tweaks"
              />
            </div>
            <Button
              size="sm"
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold shrink-0 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 hover:border-primary/30"
              data-testid="button-scan-system"
              title="Scan your Windows registry to detect which tweaks are already applied"
            >
              {detectMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ScanSearch className="h-3.5 w-3.5 text-primary" />}
              {detectMutation.isPending ? "Scanning..." : "Scan System"}
            </Button>
            {typeof window !== "undefined" && window.electronAPI?.runScript && activeTweakCount > 0 && (
              <Button
                size="sm"
                onClick={handleRunInApp}
                disabled={isRunning}
                className="h-8 gap-1.5 text-xs font-semibold shrink-0 bg-primary hover:bg-primary/90 text-white"
                data-testid="button-run-in-app"
                title="Run active tweaks directly via PowerShell (requires Administrator)"
              >
                <Play className="h-3.5 w-3.5" />
                Run in App
              </Button>
            )}
            <Button
              size="sm"
              onClick={exportScript}
              disabled={activeTweakCount === 0}
              className={cn(
                "h-8 gap-1.5 text-xs font-semibold shrink-0",
                activeTweakCount > 0
                  ? "bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground cursor-not-allowed border border-border/40"
              )}
              data-testid="button-export-script"
              title={activeTweakCount === 0 ? "Enable tweaks first, then export script" : `Export ${activeTweakCount} active tweaks as PowerShell script`}
            >
              <Download className="h-3.5 w-3.5" />
              Export .ps1
              {activeTweakCount > 0 && (
                <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] bg-primary/20">
                  {activeTweakCount}
                </span>
              )}
            </Button>
            {activeTweakCount > 0 && (
              <Button
                size="sm"
                onClick={exportUndoScript}
                className="h-8 gap-1.5 text-xs font-semibold shrink-0 bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 hover:border-border"
                data-testid="button-export-undo-script"
                title="Download a script that reverts all currently active tweaks back to Windows defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo Script
              </Button>
            )}
          </div>
          {lastScanned && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
              <Clock className="h-2.5 w-2.5" />
              Last scanned: {formatScannedTime(lastScanned)}
            </div>
          )}
        </div>
      </div>

      {/* ── Presets + Bulk Actions Bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-border/40 bg-secondary/15">
        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider shrink-0">
          Presets
        </span>
        {TWEAK_PRESETS.map((preset) => {
          const { Icon } = preset;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              disabled={isBulkPending}
              data-testid={`button-preset-${preset.id}`}
              title={preset.description}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 disabled:opacity-50",
                "border-border/50 bg-secondary/40 text-muted-foreground",
                preset.bgColor,
                preset.borderColor,
                `hover:${preset.color}`
              )}
            >
              <Icon className={cn("h-3 w-3 shrink-0", preset.color)} />
              {preset.name}
            </button>
          );
        })}
        <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />
        <button
          onClick={handleSelectAll}
          disabled={isBulkPending}
          data-testid="button-select-all-tweaks"
          title="Enable all tweaks"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 border-border/50 bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/8 hover:text-primary disabled:opacity-50"
        >
          {isBulkPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
          Select All
        </button>
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={isBulkPending || activeTweakCount === 0}
          data-testid="button-clear-all-tweaks"
          title="Disable all tweaks"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 border-border/50 bg-secondary/40 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3 w-3" />
          Clear All
        </button>
      </div>

      {/* ── Info notice ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-primary/15 bg-primary/4 text-xs text-muted-foreground/70">
        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Use <span className="text-foreground font-semibold">Scan System</span> to auto-detect applied tweaks.
          Use <span className="text-foreground font-semibold">Presets</span> to bulk-enable curated sets.
          {typeof window !== "undefined" && window.electronAPI?.runScript
            ? <> Click <span className="text-foreground font-semibold">Run in App</span> to apply directly via PowerShell (requires Admin), or <span className="text-foreground font-semibold">Export .ps1</span> to run manually.</>
            : <> Click <span className="text-foreground font-semibold">Export .ps1</span> to download a ready-to-run PowerShell script — run as Administrator.</>
          }
        </span>
      </div>

      {/* ── Category filter tabs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const total = cat === "all"
            ? tweaks?.length || 0
            : tweaks?.filter((t) => t.category.toLowerCase() === cat).length || 0;
          const active = cat === "all"
            ? activeTweakCount
            : tweaks?.filter((t) => t.category.toLowerCase() === cat && t.isActive).length || 0;
          const isSelected = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              data-testid={`filter-${cat}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 capitalize",
                isSelected
                  ? "bg-primary/12 border-primary/30 text-primary"
                  : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className={cn("h-3 w-3", isSelected ? "text-primary" : "text-muted-foreground/60")} />
              {cat}
              <span className={cn(
                "text-[10px] px-1 rounded font-mono",
                isSelected ? "text-primary/80" : "text-muted-foreground/40"
              )}>
                {active > 0 ? (
                  <span>
                    <span className={isSelected ? "text-primary" : "text-foreground/60"}>{active}</span>
                    <span className="text-muted-foreground/30">/{total}</span>
                  </span>
                ) : (
                  total
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tweaks grid ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40 bg-secondary" />
                <Skeleton className="h-5 w-10 rounded-full bg-secondary" />
              </div>
              <Skeleton className="h-12 w-full bg-secondary" />
              <Skeleton className="h-4 w-20 bg-secondary" />
            </div>
          ))}
        </div>
      ) : filteredTweaks?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No tweaks found</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Try a different search or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTweaks?.map((tweak, i) => {
              const Icon = CATEGORY_ICONS[tweak.category.toLowerCase()] || Wrench;
              const colorClass = CATEGORY_COLORS[tweak.category.toLowerCase()] || "text-primary";
              const cmd = getTweakCommand(tweak.title);
              return (
                <motion.div
                  key={tweak.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.025, 0.3) }}
                  className="h-full"
                >
                  {(() => {
                    const impact = getImpact(tweak.title);
                    const conflictTitle = getConflict(tweak.title);
                    const conflictIsActive = conflictTitle
                      ? tweaks?.find(t => t.title === conflictTitle)?.isActive
                      : false;
                    const impactStyle: Record<ImpactLevel, string> = {
                      High:   "text-green-400 bg-green-500/8 border-green-500/20",
                      Medium: "text-amber-400 bg-amber-500/8 border-amber-500/20",
                      Low:    "text-muted-foreground/60 bg-secondary/50 border-border/40",
                    };
                    return (
                      <div
                        className={cn(
                          "card-premium h-full flex flex-col p-4 rounded-xl border transition-all duration-200",
                          tweak.isActive
                            ? "bg-primary/5 border-primary/30 hover:border-primary/45"
                            : "bg-card border-border hover:border-border/80"
                        )}
                        style={tweak.isActive ? {
                          boxShadow: "0 0 20px hsl(var(--primary) / 0.12), 0 0 40px hsl(var(--primary) / 0.05), inset 0 1px 0 hsl(var(--primary) / 0.08)"
                        } : undefined}
                        data-testid={`card-tweak-${tweak.id}`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2.5">
                          <h3 className={cn(
                            "font-semibold text-[13px] leading-snug flex-1",
                            tweak.isActive ? "text-foreground" : "text-foreground/80"
                          )}>
                            {tweak.title}
                          </h3>
                          <Switch
                            checked={tweak.isActive}
                            onCheckedChange={() => updateTweak.mutate({ id: tweak.id, isActive: !tweak.isActive })}
                            className="data-[state=checked]:bg-primary shrink-0"
                            data-testid={`switch-tweak-${tweak.id}`}
                          />
                        </div>

                        <p className="text-[11.5px] text-muted-foreground leading-relaxed flex-1">
                          {tweak.description}
                        </p>

                        {tweak.warning && (
                          <div className="mt-2.5 p-2 rounded-lg flex items-start gap-2 bg-amber-500/6 border border-amber-500/15">
                            <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                            <p className="text-[11px] text-amber-400/90 leading-snug">{tweak.warning}</p>
                          </div>
                        )}

                        {tweak.featureBreaks && (
                          <div className="mt-2 p-2 rounded-lg bg-secondary/60 border border-border/40">
                            <p className="text-[10.5px] text-muted-foreground leading-snug">
                              <span className="text-foreground/60 font-semibold">Impact: </span>
                              {tweak.featureBreaks}
                            </p>
                          </div>
                        )}

                        {conflictIsActive && conflictTitle && (
                          <div className="mt-2.5 p-2 rounded-lg flex items-start gap-2 bg-orange-500/6 border border-orange-500/20">
                            <AlertOctagon className="w-3 h-3 mt-0.5 text-orange-400 shrink-0" />
                            <p className="text-[10.5px] text-orange-400/90 leading-snug">
                              Conflicts with <span className="font-semibold">"{conflictTitle}"</span> — both active. Consider disabling one.
                            </p>
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn("h-3 w-3", colorClass)} />
                              <span className={cn("text-[10px] font-semibold capitalize", colorClass)}>
                                {tweak.category}
                              </span>
                            </div>
                            {impact && (
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border",
                                impactStyle[impact]
                              )}
                                data-testid={`badge-impact-${tweak.id}`}
                              >
                                {impact}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {cmd && (
                              <button
                                onClick={() => setViewingCmd({ title: tweak.title, cmd: tweak.isActive ? cmd.disable : cmd.enable })}
                                className="flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded border border-border/40 bg-secondary/50 hover:border-primary/30 hover:bg-primary/8 text-muted-foreground hover:text-primary transition-all duration-150"
                                data-testid={`button-view-cmd-${tweak.id}`}
                              >
                                <Terminal className="h-2.5 w-2.5" />
                                View CMD
                              </button>
                            )}
                            {tweak.isActive && (
                              <div className="flex items-center gap-1 text-primary">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-[10px] font-bold">Active</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredTweaks && filteredTweaks.length > 0 && (
        <p className="text-[11px] text-muted-foreground/40 text-center pt-2">
          Showing {filteredTweaks.length} tweak{filteredTweaks.length !== 1 ? "s" : ""}
          {activeTweakCount > 0 && ` · ${activeTweakCount} active`}
        </p>
      )}
    </div>
  );
}
