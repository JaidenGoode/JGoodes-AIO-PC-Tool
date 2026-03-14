import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Wrench, Zap, SlidersHorizontal,
  AlertTriangle, Gamepad2, Globe, CheckCircle2,
  Download, Copy, Check, Terminal, Loader2, ScanSearch,
  Play, X, RotateCcw, AlertOctagon, Info, CheckSquare, Network,
  Upload, Database,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { getTweakCommand, generatePowerShellScript, generateUndoScript } from "@tweaks/commands";
import { bulkUpdateTweaks } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TWEAK_PRESETS } from "@tweaks/presets";
import { getImpact, type ImpactLevel } from "@tweaks/impacts";
import { getConflict } from "@tweaks/conflicts";
import { useDetect } from "@/contexts/detect-context";

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizeChange: (callback: (v: boolean) => void) => () => void;
      runScript: (script: string) => Promise<{ success: boolean; code: number }>;
      onScriptOutput: (callback: (data: { type: string; text?: string; code?: number }) => void) => () => void;
      saveFile?: (content: string, defaultName: string) => Promise<{ success: boolean; error?: string }>;
      openFile?: () => Promise<{ success: boolean; content?: string; error?: string }>;
    };
  }
}

const CATEGORIES = ["all", "performance", "gaming", "system", "browser", "network"] as const;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  performance: Zap,
  system: SlidersHorizontal,
  gaming: Gamepad2,
  browser: Globe,
  network: Network,
  all: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  performance: "text-yellow-400",
  system: "text-purple-400",
  gaming: "text-green-400",
  browser: "text-cyan-400",
  network: "text-teal-400",
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


export default function Tweaks() {
  const { data: tweaks, isLoading } = useTweaks();
  const updateTweak = useUpdateTweak();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { triggerDetect, isDetecting, hasInitialDetect } = useDetect();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [showRestorePrompt, setShowRestorePrompt] = useState(() => !localStorage.getItem("restore_prompt_shown"));
  const [viewingCmd, setViewingCmd] = useState<{ title: string; cmd: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [dialogMode, setDialogMode] = useState<"apply" | "revert">("apply");
  const [scriptOutput, setScriptOutput] = useState<Array<{ type: string; text: string }>>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importTweakTitles, setImportTweakTitles] = useState<string[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const bulkMutation = useMutation({
    mutationFn: ({ titles, isActive }: { titles: string[]; isActive: boolean }) =>
      bulkUpdateTweaks(titles, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
      triggerDetect(1000);
    },
    onError: () => {
      toast({ title: "Operation failed", description: "Could not update tweaks.", variant: "destructive" });
    },
  });

  const handleClosePrompt = (wantsRestore: boolean) => {
    localStorage.setItem("restore_prompt_shown", "true");
    setShowRestorePrompt(false);
    if (wantsRestore) setLocation("/restore");
  };

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllUnoptimized = useCallback(() => {
    if (!tweaks) return;
    const unoptimized = tweaks.filter(t => !t.isActive).map(t => t.id);
    setSelectedIds(new Set(unoptimized));
  }, [tweaks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOptimizeSelected = async () => {
    if (!tweaks || selectedIds.size === 0) return;

    const selectedTweaks = tweaks.filter(t => selectedIds.has(t.id) && !t.isActive);
    if (selectedTweaks.length === 0) {
      toast({ title: "Nothing to optimize", description: "Selected tweaks are already applied.", variant: "destructive" });
      setSelectedIds(new Set());
      return;
    }

    const titles = selectedTweaks.map(t => t.title);
    setApplyingAll(true);
    setIsRunning(true);
    setDialogMode("apply");

    if (window.electronAPI?.runScript) {
      const tempTweaks = selectedTweaks.map(t => ({ title: t.title, isActive: true }));
      const script = generatePowerShellScript(tempTweaks);
      if (!script) {
        setApplyingAll(false);
        setIsRunning(false);
        return;
      }

      setScriptOutput([{ type: "info", text: `# JGoode's A.I.O PC Tool — Optimizing ${selectedTweaks.length} tweaks\n# Running as Administrator...\n` }]);
      setShowRunDialog(true);

      const safetyTimeout = setTimeout(() => {
        setIsRunning(false);
        setApplyingAll(false);
        setSelectedIds(new Set());
        cleanupRef.current?.();
        cleanupRef.current = null;
        queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) =>
          old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old
        );
        bulkMutation.mutate({ titles, isActive: true });
        triggerDetect(800);
      }, 120000);

      cleanupRef.current = window.electronAPI.onScriptOutput((data) => {
        if (data.type === "done") {
          clearTimeout(safetyTimeout);
          setIsRunning(false);
          setApplyingAll(false);
          setScriptOutput((prev) => [
            ...prev,
            {
              type: data.code === 0 ? "success" : "stderr",
              text: data.code === 0
                ? `\n\u2713 ${selectedTweaks.length} tweaks optimized successfully.`
                : `\n\u2717 Script exited with code ${data.code}.`,
            },
          ]);
          cleanupRef.current?.();
          cleanupRef.current = null;
          setSelectedIds(new Set());
          // Immediately mark tweaks as optimized in the UI cache so badges update right away
          queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) =>
            old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old
          );
          bulkMutation.mutate({ titles, isActive: true });
          // First scan at 800ms — catches registry changes immediately
          triggerDetect(800);
          // Second confirm scan at 9s — catches service state changes that take time to settle
          triggerDetect(9000);
          // Auto-close dialog after success so user sees the optimized badges
          if (data.code === 0) {
            setTimeout(() => {
              setShowRunDialog(false);
              setScriptOutput([]);
            }, 2500);
          }
        } else if (data.text) {
          setScriptOutput((prev) => [...prev, { type: data.type, text: data.text! }]);
        }
      });

      try {
        await window.electronAPI.runScript(script);
      } catch (err) {
        clearTimeout(safetyTimeout);
        setIsRunning(false);
        setApplyingAll(false);
        setScriptOutput((prev) => [...prev, { type: "stderr", text: String(err) }]);
        cleanupRef.current?.();
        cleanupRef.current = null;
        setSelectedIds(new Set());
      }
    } else {
      try {
        // Immediately mark tweaks as optimized in the UI cache
        queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) =>
          old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old
        );
        setSelectedIds(new Set());
        await bulkMutation.mutateAsync({ titles, isActive: true });
        toast({ title: "Tweaks optimized", description: `${selectedTweaks.length} tweaks marked as optimized. Export the .ps1 script and run on Windows to apply.` });
      } catch {
        toast({ title: "Operation failed", description: "Could not update tweaks.", variant: "destructive" });
      } finally {
        setApplyingAll(false);
        setIsRunning(false);
      }
    }
  };

  const applyPreset = async (preset: typeof TWEAK_PRESETS[number]) => {
    if (!tweaks) return;
    const presetTweaks = preset.id === "all"
      ? tweaks.filter(t => !t.isActive)
      : tweaks.filter(t => preset.titles.includes(t.title) && !t.isActive);
    const ids = new Set(presetTweaks.map(t => t.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    toast({
      title: `${preset.name} preset selected`,
      description: `${presetTweaks.length} un-optimized tweaks selected. Click "Optimize Selected" to apply.`,
    });
  };

  const closeRunDialog = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setShowRunDialog(false);
    setScriptOutput([]);
    setIsRunning(false);
    setApplyingAll(false);
    setSelectedIds(new Set());
    triggerDetect(500);
  };

  const exportScript = () => {
    if (!tweaks) return;
    const toExport = selectedIds.size > 0
      ? tweaks.filter(t => selectedIds.has(t.id)).map(t => ({ ...t, isActive: true }))
      : tweaks.filter(t => t.isActive).map(t => ({ ...t, isActive: true }));
    const script = generatePowerShellScript(toExport);
    if (!script) {
      toast({ title: "No tweaks to export", description: "Select tweaks first, then export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JGoode-AIO-Tweaks.ps1";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Script exported", description: `${toExport.length} tweaks exported as .ps1 file.` });
  };

  const exportUndoScript = () => {
    if (!tweaks) return;
    const script = generateUndoScript(tweaks);
    if (!script) {
      toast({ title: "No tweaks to reverse", description: "No optimized tweaks found.", variant: "destructive" });
      return;
    }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JGoode-AIO-Undo.ps1";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Undo script downloaded", description: "Run as Administrator to revert all optimized tweaks." });
  };

  const runRevertScript = async (tweaksToRevert: Array<{ title: string; isActive: boolean }>, label: string) => {
    const titles = tweaksToRevert.map(t => t.title);
    setDialogMode("revert");
    setIsRunning(true);

    if (window.electronAPI?.runScript) {
      const script = generateUndoScript(tweaksToRevert);
      if (!script) { setIsRunning(false); return; }

      setScriptOutput([{ type: "info", text: `# JGoode's A.I.O PC Tool — ${label}\n# Running as Administrator...\n` }]);
      setShowRunDialog(true);

      const safetyTimeout = setTimeout(() => {
        setIsRunning(false);
        cleanupRef.current?.();
        cleanupRef.current = null;
        queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) =>
          old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: false } : t) : old
        );
        bulkMutation.mutate({ titles, isActive: false });
        triggerDetect(800);
      }, 120000);

      cleanupRef.current = window.electronAPI.onScriptOutput((data) => {
        if (data.type === "done") {
          clearTimeout(safetyTimeout);
          setIsRunning(false);
          cleanupRef.current?.();
          cleanupRef.current = null;
          setScriptOutput((prev) => [
            ...prev,
            {
              type: data.code === 0 ? "success" : "stderr",
              text: data.code === 0
                ? `\n\u2713 ${tweaksToRevert.length} tweak${tweaksToRevert.length !== 1 ? "s" : ""} reverted to Windows defaults.`
                : `\n\u26a0 Completed with errors (exit code: ${data.code})`,
            },
          ]);
          queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) =>
            old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: false } : t) : old
          );
          bulkMutation.mutate({ titles, isActive: false });
          // First pass at 3s — gives services time to fully stop before re-detecting.
          // 800ms was too fast: service tweaks (SysMain, WSearch, etc.) can take 2-4s to stop,
          // causing the detect to re-mark them as active and undo the revert in the UI.
          triggerDetect(3000);
          // Second pass at 8s — catches anything that took longer to settle.
          setTimeout(() => triggerDetect(0), 8000);
          if (data.code === 0) {
            setTimeout(() => { setShowRunDialog(false); setScriptOutput([]); }, 2500);
          }
        } else if (data.text) {
          setScriptOutput((prev) => [...prev, { type: data.type, text: data.text ?? "" }]);
          if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      });

      try { await window.electronAPI.runScript(script); } catch {
        clearTimeout(safetyTimeout);
        setIsRunning(false);
      }
    } else {
      // Non-Electron fallback: just update the DB and download script
      exportUndoScript();
      bulkMutation.mutate({ titles, isActive: false });
      setIsRunning(false);
    }
  };

  const handleRevertAll = async () => {
    if (!tweaks) return;
    const activeTweaks = tweaks.filter(t => t.isActive);
    if (activeTweaks.length === 0) {
      toast({ title: "Nothing to revert", description: "No tweaks are currently applied.", variant: "destructive" });
      return;
    }
    await runRevertScript(activeTweaks, `Reverting all ${activeTweaks.length} applied tweaks`);
  };

  const handleRevertSelected = async () => {
    if (!tweaks || selectedIds.size === 0) return;
    const selectedActive = tweaks.filter(t => selectedIds.has(t.id) && t.isActive);
    if (selectedActive.length === 0) {
      toast({ title: "Nothing to revert", description: "None of the selected tweaks are currently applied.", variant: "destructive" });
      return;
    }
    await runRevertScript(selectedActive, `Reverting ${selectedActive.length} selected tweak${selectedActive.length !== 1 ? "s" : ""}`);
    setSelectedIds(new Set());
  };

  const handleRevertOne = async (tweak: { id: number; title: string; isActive: boolean }) => {
    if (isRunning) return;
    await runRevertScript([tweak], `Reverting "${tweak.title}"`);
  };

  const parseAndConfirmImport = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (!parsed.tweaks || !Array.isArray(parsed.tweaks)) {
        toast({ title: "Invalid profile", description: "File does not contain a valid tweak profile.", variant: "destructive" });
        return;
      }
      const validTitles = (parsed.tweaks as unknown[]).filter(
        (t): t is string => typeof t === "string" && (tweaks?.some(tw => tw.title === t) ?? false)
      );
      if (validTitles.length === 0) {
        toast({ title: "No matching tweaks", description: "None of the tweaks in this profile are recognized in the current database.", variant: "destructive" });
        return;
      }
      setImportTweakTitles(validTitles);
      setShowImportConfirm(true);
    } catch {
      toast({ title: "Invalid file", description: "Could not parse the profile JSON.", variant: "destructive" });
    }
  };

  const handleExportProfile = async () => {
    if (!tweaks) return;
    const activeTweaks = tweaks.filter(t => t.isActive);
    if (activeTweaks.length === 0) {
      toast({ title: "Nothing to export", description: "No tweaks are currently applied.", variant: "destructive" });
      return;
    }
    const profile = JSON.stringify({
      app: "JGoode's A.I.O PC Tool",
      version: "3.5.0",
      exported: new Date().toISOString(),
      tweaks: activeTweaks.map(t => t.title),
    }, null, 2);
    const fileName = `JGoode-Profile-${new Date().toISOString().split("T")[0]}.json`;
    if (window.electronAPI?.saveFile) {
      const result = await window.electronAPI.saveFile(profile, fileName);
      if (result.success) {
        toast({ title: "Profile saved", description: `Exported ${activeTweaks.length} active tweak${activeTweaks.length !== 1 ? "s" : ""}.` });
      }
    } else {
      const blob = new Blob([profile], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Profile exported", description: `Exported ${activeTweaks.length} tweak${activeTweaks.length !== 1 ? "s" : ""}.` });
    }
  };

  const handleImportProfile = async () => {
    if (window.electronAPI?.openFile) {
      const result = await window.electronAPI.openFile();
      if (!result.success || !result.content) return;
      parseAndConfirmImport(result.content);
    } else {
      importFileRef.current?.click();
    }
  };

  const handleConfirmImport = async () => {
    setShowImportConfirm(false);
    if (!tweaks || importTweakTitles.length === 0) return;
    const titlesToCapture = [...importTweakTitles];
    setImportTweakTitles([]);
    const toApply = tweaks.filter(t => titlesToCapture.includes(t.title) && !t.isActive);
    if (toApply.length === 0) {
      toast({ title: "Already applied", description: "All tweaks in this profile are already active." });
      return;
    }
    const titles = toApply.map(t => t.title);
    setApplyingAll(true);
    setIsRunning(true);
    setDialogMode("apply");
    if (window.electronAPI?.runScript) {
      const script = generatePowerShellScript(toApply.map(t => ({ ...t, isActive: true })));
      if (!script) { setApplyingAll(false); setIsRunning(false); return; }
      setScriptOutput([{ type: "info", text: `# JGoode's A.I.O PC Tool — Importing ${toApply.length} tweak${toApply.length !== 1 ? "s" : ""} from profile\n# Running as Administrator...\n` }]);
      setShowRunDialog(true);
      const safetyTimeout = setTimeout(() => {
        setIsRunning(false); setApplyingAll(false); cleanupRef.current?.(); cleanupRef.current = null;
        queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) => old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old);
        bulkMutation.mutate({ titles, isActive: true });
        triggerDetect(800);
      }, 120000);
      cleanupRef.current = window.electronAPI.onScriptOutput((data) => {
        if (data.type === "done") {
          clearTimeout(safetyTimeout);
          setIsRunning(false); setApplyingAll(false);
          setScriptOutput((prev) => [...prev, { type: data.code === 0 ? "success" : "stderr", text: data.code === 0 ? `\n\u2713 ${toApply.length} tweak${toApply.length !== 1 ? "s" : ""} imported successfully.` : `\n\u2717 Script exited with code ${data.code}.` }]);
          cleanupRef.current?.(); cleanupRef.current = null;
          queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) => old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old);
          bulkMutation.mutate({ titles, isActive: true });
          triggerDetect(800); triggerDetect(9000);
          if (data.code === 0) setTimeout(() => { setShowRunDialog(false); setScriptOutput([]); }, 2500);
        } else if (data.text) {
          setScriptOutput(prev => [...prev, { type: data.type, text: data.text! }]);
        }
      });
      try { await window.electronAPI.runScript(script); }
      catch (err) {
        clearTimeout(safetyTimeout);
        setIsRunning(false); setApplyingAll(false);
        setScriptOutput((prev) => [...prev, { type: "stderr", text: String(err) }]);
        cleanupRef.current?.(); cleanupRef.current = null;
      }
    } else {
      try {
        queryClient.setQueryData<Array<{ id: number; title: string; isActive: boolean }>>(["/api/tweaks"], (old) => old ? old.map(t => titles.includes(t.title) ? { ...t, isActive: true } : t) : old);
        await bulkMutation.mutateAsync({ titles, isActive: true });
        toast({ title: "Profile imported", description: `${toApply.length} tweak${toApply.length !== 1 ? "s" : ""} applied. Export the .ps1 script and run on Windows to apply registry changes.` });
      } catch {
        toast({ title: "Import failed", description: "Could not update tweaks.", variant: "destructive" });
      } finally {
        setApplyingAll(false); setIsRunning(false);
      }
    }
  };

  const IMPACT_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  const filteredTweaks = tweaks
    ?.filter((tweak) => {
      const matchesSearch =
        tweak.title.toLowerCase().includes(search.toLowerCase()) ||
        tweak.description.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || tweak.category.toLowerCase() === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const impA = getImpact(a.title);
      const impB = getImpact(b.title);
      const orderA = impA != null ? IMPACT_ORDER[impA] : 3;
      const orderB = impB != null ? IMPACT_ORDER[impB] : 3;
      return orderA - orderB;
    });

  const optimizedCount = tweaks?.filter((t) => t.isActive).length || 0;
  const totalCount = tweaks?.length || 0;
  const selectedCount = selectedIds.size;
  const isBulkPending = bulkMutation.isPending;
  const optimizedPercent = totalCount > 0 ? Math.round((optimizedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Import profile confirmation dialog */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Import Tweak Profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Found <span className="text-primary font-bold">{importTweakTitles.length}</span> recognized tweak{importTweakTitles.length !== 1 ? "s" : ""} in this profile. Already-active tweaks will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-import">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImport}
              className="bg-primary text-white"
              data-testid="button-confirm-import"
            >
              Apply {importTweakTitles.length} Tweak{importTweakTitles.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Command viewer dialog */}
      <Dialog open={!!viewingCmd} onOpenChange={() => setViewingCmd(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Terminal className="h-4 w-4 text-primary" />
              {viewingCmd?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Run this in PowerShell as Administrator to apply this tweak.
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
              {isRunning
                ? (dialogMode === "revert" ? "Reverting..." : "Optimizing...")
                : (dialogMode === "revert" ? "Revert Complete" : "Optimization Complete")}
              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1" />}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              PowerShell output — requires Administrator to run.
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
            {isRunning && <div className="text-primary animate-pulse mt-1">&#9612;</div>}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[10px] text-muted-foreground/40">
              {isRunning
                ? (dialogMode === "revert" ? "Do not close — revert in progress" : "Do not close — optimization in progress")
                : (dialogMode === "revert" ? "Revert complete" : "Optimization complete")}
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
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            System <span className="text-primary">Tweaks</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-detected from your system
            {hasInitialDetect && (
              <span className="ml-1.5">
                <span className="text-primary font-bold">{optimizedCount}</span>
                <span className="text-muted-foreground/60">/{totalCount} optimized</span>
                {selectedCount > 0 && (
                  <span className="ml-2 text-primary font-bold">{selectedCount} selected</span>
                )}
              </span>
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
              onClick={() => triggerDetect()}
              disabled={isDetecting}
              className="h-8 gap-1.5 text-xs font-semibold shrink-0 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 hover:border-primary/30"
              data-testid="button-scan-system"
              title="Re-scan your Windows registry to detect which tweaks are applied"
            >
              {isDetecting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ScanSearch className="h-3.5 w-3.5 text-primary" />}
              {isDetecting ? "Scanning..." : "Re-scan"}
            </Button>
            {selectedCount > 0 && (
              <Button
                size="sm"
                onClick={handleOptimizeSelected}
                disabled={applyingAll || isRunning || isBulkPending}
                className="h-8 gap-1.5 text-xs font-bold shrink-0 bg-primary hover:bg-primary/90 text-white"
                data-testid="button-optimize-selected"
                title={`Apply ${selectedCount} selected tweaks`}
              >
                {(applyingAll || isBulkPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Optimize Selected
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/20 font-bold">{selectedCount}</span>
              </Button>
            )}
            {selectedCount > 0 && tweaks?.some(t => selectedIds.has(t.id) && t.isActive) && (
              <Button
                size="sm"
                onClick={handleRevertSelected}
                disabled={isRunning || isBulkPending}
                className="h-8 gap-1.5 text-xs font-bold shrink-0 border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/70"
                data-testid="button-revert-selected"
                title="Revert selected applied tweaks back to Windows defaults"
              >
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Revert Selected
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 font-bold">
                  {tweaks?.filter(t => selectedIds.has(t.id) && t.isActive).length}
                </span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={exportScript}
              disabled={optimizedCount === 0 && selectedCount === 0}
              className={cn(
                "h-8 gap-1.5 text-xs font-semibold shrink-0",
                (optimizedCount > 0 || selectedCount > 0)
                  ? "bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground cursor-not-allowed border border-border/40"
              )}
              data-testid="button-export-script"
              title="Export tweaks as a .ps1 script"
            >
              <Download className="h-3.5 w-3.5" />
              Export .ps1
            </Button>
            <Button
              size="sm"
              onClick={handleExportProfile}
              disabled={optimizedCount === 0}
              className={cn(
                "h-8 gap-1.5 text-xs font-semibold shrink-0",
                optimizedCount > 0
                  ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 hover:border-primary/30"
                  : "bg-secondary text-muted-foreground cursor-not-allowed border border-border/40"
              )}
              data-testid="button-save-profile"
              title="Save active tweaks as a reusable JSON profile"
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              Save Profile
            </Button>
            <Button
              size="sm"
              onClick={handleImportProfile}
              disabled={isRunning || isBulkPending}
              className="h-8 gap-1.5 text-xs font-semibold shrink-0 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 hover:border-primary/30"
              data-testid="button-load-profile"
              title="Load and apply a saved JSON profile"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              Load Profile
            </Button>
            {optimizedCount > 0 && (
              <Button
                size="sm"
                onClick={handleRevertAll}
                disabled={isRunning || isBulkPending}
                className="h-8 gap-1.5 text-xs font-semibold shrink-0 border border-red-500/30 bg-red-500/8 text-red-400/80 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/50"
                data-testid="button-revert-all"
                title="Revert ALL applied tweaks back to Windows defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert All ({optimizedCount})
              </Button>
            )}
          </div>
          <div className={cn("flex items-center gap-1 text-[10px] text-primary/60", !isDetecting && "invisible")}>
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Scanning system registry...
          </div>
        </div>
      </div>

      {/* ── Optimization Progress Bar ────────────────────────────────────── */}
      {hasInitialDetect && (
        <div className="p-4 rounded-xl border border-border/40 bg-secondary/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">System Optimization</span>
            <span className="text-xs font-bold text-primary">{optimizedPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${optimizedPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground/60">
              {optimizedCount} of {totalCount} tweaks optimized
            </span>
            {optimizedCount < totalCount && (
              <button
                onClick={selectAllUnoptimized}
                className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                data-testid="button-select-remaining"
              >
                Select remaining {totalCount - optimizedCount} tweaks
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Presets + Bulk Actions Bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-border/40 bg-secondary/15">
        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider shrink-0">
          Quick Select
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
          onClick={selectAllUnoptimized}
          disabled={isBulkPending}
          data-testid="button-select-all-tweaks"
          title="Select all un-optimized tweaks"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 border-border/50 bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/8 hover:text-primary disabled:opacity-50"
        >
          <CheckSquare className="h-3 w-3" />
          Select All
        </button>
        {selectedCount > 0 && (
          <button
            onClick={clearSelection}
            data-testid="button-clear-selection"
            title="Clear selection"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 border-border/50 bg-secondary/40 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-400"
          >
            <X className="h-3 w-3" />
            Clear ({selectedCount})
          </button>
        )}
      </div>

      {/* ── Info notice ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-primary/15 bg-primary/4 text-xs text-muted-foreground/70">
        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Tweaks are <span className="text-foreground font-semibold">auto-detected</span> from your system on startup.
          Already applied tweaks show as <span className="text-primary font-semibold">Optimized</span>.
          Select un-optimized tweaks and click <span className="text-primary font-semibold">Optimize Selected</span> to apply them.
        </span>
      </div>

      {/* ── Category filter tabs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const total = cat === "all"
            ? tweaks?.length || 0
            : tweaks?.filter((t) => t.category.toLowerCase() === cat).length || 0;
          const optimized = cat === "all"
            ? optimizedCount
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
                {optimized > 0 ? (
                  <span>
                    <span className={isSelected ? "text-primary" : "text-primary/60"}>{optimized}</span>
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
            <div key={i} className="h-36 rounded-xl border border-border bg-card animate-pulse" />
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
              const isOptimized = tweak.isActive;
              const isSelected = selectedIds.has(tweak.id);
              const impact = getImpact(tweak.title);
              const conflictTitle = getConflict(tweak.title);
              const conflictIsActive = conflictTitle
                ? tweaks?.find(t => t.title === conflictTitle)?.isActive
                : false;
              const impactStyle: Record<ImpactLevel, string> = {
                High:   "text-primary bg-primary/8 border-primary/20",
                Medium: "text-amber-400 bg-amber-500/8 border-amber-500/20",
                Low:    "text-muted-foreground/60 bg-secondary/50 border-border/40",
              };

              return (
                <motion.div
                  key={tweak.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="h-full"
                >
                  <div
                    className={cn(
                      "card-premium h-full flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                      isOptimized
                        ? "bg-primary/4 border-primary/25 hover:border-primary/40"
                        : isSelected
                          ? "bg-primary/6 border-primary/35 hover:border-primary/50"
                          : "bg-card border-border hover:border-border/80"
                    )}
                    style={(isOptimized || isSelected) ? {
                      boxShadow: "0 0 15px hsl(var(--primary) / 0.1), inset 0 1px 0 hsl(var(--primary) / 0.06)"
                    } : undefined}
                    onClick={() => !isOptimized && toggleSelect(tweak.id)}
                    data-testid={`card-tweak-${tweak.id}`}
                  >
                    <div className="flex justify-between items-start gap-3 mb-2.5">
                      <h3 className={cn(
                        "font-semibold text-[13px] leading-snug flex-1",
                        isOptimized ? "text-foreground" : "text-foreground/80"
                      )}>
                        {tweak.title}
                      </h3>
                      {isOptimized ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/12 border border-primary/25 shrink-0" data-testid={`badge-optimized-${tweak.id}`}>
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold text-primary">Optimized</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(tweak.id); }}
                          className={cn(
                            "flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-150 shrink-0",
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border/60 hover:border-primary/50"
                          )}
                          data-testid={`checkbox-tweak-${tweak.id}`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      )}
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
                          Conflicts with <span className="font-semibold">"{conflictTitle}"</span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCmd({ title: tweak.title, cmd: isOptimized ? cmd.disable : cmd.enable });
                            }}
                            className="flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded border border-border/40 bg-secondary/50 hover:border-primary/30 hover:bg-primary/8 text-muted-foreground hover:text-primary transition-all duration-150"
                            data-testid={`button-view-cmd-${tweak.id}`}
                          >
                            <Terminal className="h-2.5 w-2.5" />
                            {isOptimized ? "Undo CMD" : "View CMD"}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRevertOne(tweak); }}
                          disabled={isRunning}
                          className={cn(
                            "flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
                            isOptimized
                              ? "border-red-500/40 bg-red-500/8 text-red-400 hover:bg-red-500/18 hover:border-red-500/60"
                              : "border-border/30 bg-secondary/40 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-400"
                          )}
                          data-testid={`button-revert-one-${tweak.id}`}
                          title={`Revert "${tweak.title}" back to Windows default`}
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          Revert
                        </button>
                        {isSelected && !isOptimized && (
                          <div className="flex items-center gap-1 text-primary">
                            <CheckSquare className="h-3 w-3" />
                            <span className="text-[10px] font-bold">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredTweaks && filteredTweaks.length > 0 && (
        <p className="text-[11px] text-muted-foreground/40 text-center pt-2">
          Showing {filteredTweaks.length} tweak{filteredTweaks.length !== 1 ? "s" : ""}
          {optimizedCount > 0 && <span> · <span className="text-primary/60">{optimizedCount} optimized</span></span>}
          {selectedCount > 0 && <span> · <span className="text-primary/60">{selectedCount} selected</span></span>}
        </p>
      )}

      {/* ── Floating Apply Button ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={handleOptimizeSelected}
              disabled={applyingAll || isRunning || isBulkPending}
              data-testid="button-float-apply"
              style={{
                boxShadow: "0 8px 28px rgba(0,0,0,0.55), 0 0 22px hsl(var(--primary) / 0.38)",
              }}
              className={cn(
                "flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-xl",
                "bg-primary text-white font-bold text-[13px] tracking-wide",
                "border border-white/10",
                "transition-all duration-150 cursor-pointer",
                "hover:brightness-110 active:scale-[0.97] active:brightness-100",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {(applyingAll || isBulkPending)
                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                : <Play className="h-3.5 w-3.5 shrink-0" />}
              Apply Selected
              <span className="ml-0.5 flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-black/25 text-[10px] font-extrabold tabular-nums leading-none">
                {selectedCount}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for web-mode profile import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        className="hidden"
        data-testid="input-import-profile-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (content) parseAndConfirmImport(content);
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
