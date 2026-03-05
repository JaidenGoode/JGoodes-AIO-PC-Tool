import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Wrench, Shield, Zap, SlidersHorizontal,
  AlertTriangle, Ghost, Gamepad2, Globe, Info, CheckCircle2,
  Download, Copy, Check, Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTweaks, useUpdateTweak } from "@/hooks/use-tweaks";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getTweakCommand, generatePowerShellScript } from "@/lib/tweak-commands";

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

export default function Tweaks() {
  const { data: tweaks, isLoading } = useTweaks();
  const updateTweak = useUpdateTweak();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [showRestorePrompt, setShowRestorePrompt] = useState(() => !localStorage.getItem("restore_prompt_shown"));
  const [viewingCmd, setViewingCmd] = useState<{ title: string; cmd: string } | null>(null);

  const handleClosePrompt = (wantsRestore: boolean) => {
    localStorage.setItem("restore_prompt_shown", "true");
    setShowRestorePrompt(false);
    if (wantsRestore) setLocation("/restore");
  };

  const filteredTweaks = tweaks?.filter((tweak) => {
    const matchesSearch =
      tweak.title.toLowerCase().includes(search.toLowerCase()) ||
      tweak.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tweak.category.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const activeTweakCount = tweaks?.filter(t => t.isActive).length || 0;

  const exportScript = () => {
    if (!tweaks) return;
    const script = generatePowerShellScript(tweaks);
    if (!script) {
      alert("No tweaks are active yet. Toggle some tweaks on first.");
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
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
            onClick={exportScript}
            disabled={activeTweakCount === 0}
            className={cn(
              "h-8 gap-1.5 text-xs font-semibold shrink-0",
              activeTweakCount > 0
                ? "bg-primary hover:bg-primary/90 text-white"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
            data-testid="button-export-script"
            title={activeTweakCount === 0 ? "Enable tweaks first, then export script" : `Export ${activeTweakCount} active tweaks as PowerShell script`}
          >
            <Download className="h-3.5 w-3.5" />
            Export .ps1
            {activeTweakCount > 0 && (
              <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] bg-white/20">
                {activeTweakCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground/80">
        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Toggle tweaks to mark them active, then click{" "}
          <span className="text-foreground font-semibold">Export .ps1</span>{" "}
          to download a ready-to-run PowerShell script. Run it as Administrator on your Windows PC to apply all changes. Each tweak card also has a{" "}
          <span className="text-foreground font-semibold">View CMD</span>{" "}
          button so you can inspect or copy individual commands.
        </span>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const count = cat === "all"
            ? tweaks?.length || 0
            : tweaks?.filter(t => t.category.toLowerCase() === cat).length || 0;
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              data-testid={`filter-${cat}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 capitalize",
                isActive
                  ? "bg-primary/12 border-primary/30 text-primary"
                  : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className={cn("h-3 w-3", isActive ? "text-primary" : "text-muted-foreground/60")} />
              {cat}
              <span className={cn(
                "text-[10px] px-1 rounded",
                isActive ? "text-primary/70" : "text-muted-foreground/40"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tweaks grid */}
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
                  <div
                    className={cn(
                      "h-full flex flex-col p-4 rounded-xl border transition-all duration-150",
                      tweak.isActive
                        ? "bg-primary/5 border-primary/25 hover:border-primary/40"
                        : "bg-card border-border hover:border-border/80"
                    )}
                    data-testid={`card-tweak-${tweak.id}`}
                  >
                    {/* Title row */}
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

                    {/* Description */}
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed flex-1">
                      {tweak.description}
                    </p>

                    {/* Warning */}
                    {tweak.warning && (
                      <div className="mt-2.5 p-2 rounded-lg flex items-start gap-2 bg-amber-500/6 border border-amber-500/15">
                        <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                        <p className="text-[11px] text-amber-400/90 leading-snug">{tweak.warning}</p>
                      </div>
                    )}

                    {/* Feature breaks */}
                    {tweak.featureBreaks && (
                      <div className="mt-2 p-2 rounded-lg bg-secondary/60 border border-border/40">
                        <p className="text-[10.5px] text-muted-foreground leading-snug">
                          <span className="text-foreground/60 font-semibold">Impact: </span>
                          {tweak.featureBreaks}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3 w-3", colorClass)} />
                        <span className={cn("text-[10px] font-semibold capitalize", colorClass)}>
                          {tweak.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cmd && (
                          <button
                            onClick={() => setViewingCmd({ title: tweak.title, cmd: tweak.isActive ? cmd.enable : cmd.enable })}
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
