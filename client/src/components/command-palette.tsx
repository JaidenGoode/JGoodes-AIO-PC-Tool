import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { generatePowerShellScript, generateUndoScript } from "@/lib/tweak-commands";
import { useTweaks } from "@/hooks/use-tweaks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TWEAK_PRESETS } from "@/lib/tweak-presets";
import {
  LayoutDashboard, Wrench, Trash2, Globe, ShieldCheck, Zap,
  Settings, Download, ScanSearch, Gamepad2, Shield, ChevronRight,
  Terminal, RotateCcw, Sparkles, Github, X,
} from "lucide-react";

type Command = {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ElementType;
  action: () => void | Promise<void>;
  keywords?: string[];
};

async function bulkUpdate(titles: string[], isActive: boolean) {
  const res = await fetch("/api/tweaks/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titles, isActive }),
  });
  if (!res.ok) throw new Error("bulk update failed");
  return res.json();
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, setLocation] = useLocation();
  const { data: tweaks } = useTweaks();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const bulkMutation = useMutation({
    mutationFn: ({ titles, isActive }: { titles: string[]; isActive: boolean }) =>
      bulkUpdate(titles, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] }),
  });

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const nav = (path: string) => { close(); setLocation(path); };

  const run = async (action: () => void | Promise<void>) => {
    close();
    await action();
  };

  const exportScript = () => {
    if (!tweaks) return;
    const script = generatePowerShellScript(tweaks);
    if (!script) { toast({ title: "No active tweaks to export" }); return; }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "JGoode-AIO-Tweaks.ps1"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportUndo = () => {
    if (!tweaks) return;
    const script = generateUndoScript(tweaks);
    if (!script) { toast({ title: "No active tweaks to reverse" }); return; }
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "JGoode-AIO-Undo.ps1"; a.click();
    URL.revokeObjectURL(url);
  };

  const gamingPreset  = TWEAK_PRESETS.find(p => p.id === "gaming");
  const privacyPreset = TWEAK_PRESETS.find(p => p.id === "privacy");
  const perfPreset    = TWEAK_PRESETS.find(p => p.id === "performance");

  const commands: Command[] = [
    { id: "nav-dashboard",  label: "Go to Dashboard",      category: "Navigate", icon: LayoutDashboard, action: () => nav("/"),           keywords: ["home"] },
    { id: "nav-tweaks",     label: "Go to Tweaks",         category: "Navigate", icon: Wrench,          action: () => nav("/tweaks"),      keywords: ["optimize"] },
    { id: "nav-cleaner",    label: "Go to Cleaner",        category: "Navigate", icon: Trash2,          action: () => nav("/cleaner"),     keywords: ["clean"] },
    { id: "nav-dns",        label: "Go to DNS Manager",    category: "Navigate", icon: Globe,           action: () => nav("/dns"),         keywords: ["network"] },
    { id: "nav-restore",    label: "Go to Restore Points", category: "Navigate", icon: ShieldCheck,     action: () => nav("/restore"),     keywords: ["backup"] },
    { id: "nav-utilities",  label: "Go to Utilities",      category: "Navigate", icon: Zap,             action: () => nav("/utilities"),   keywords: ["tools"] },
    { id: "nav-settings",   label: "Go to Settings",       category: "Navigate", icon: Settings,        action: () => nav("/settings") },
    { id: "nav-github",     label: "Go to GitHub",         category: "Navigate", icon: Github,          action: () => nav("/github") },

    {
      id: "preset-gaming", label: "Apply Gaming Preset",
      description: "Enable 20 gaming & performance tweaks",
      category: "Tweaks", icon: Gamepad2, keywords: ["gaming", "fps", "game"],
      action: async () => {
        if (!gamingPreset) return;
        await bulkMutation.mutateAsync({ titles: gamingPreset.titles, isActive: true });
        toast({ title: "Gaming preset applied", description: `${gamingPreset.titles.length} tweaks enabled` });
      },
    },
    {
      id: "preset-privacy", label: "Apply Privacy Preset",
      description: "Block telemetry and data collection",
      category: "Tweaks", icon: Shield, keywords: ["privacy", "telemetry"],
      action: async () => {
        if (!privacyPreset) return;
        await bulkMutation.mutateAsync({ titles: privacyPreset.titles, isActive: true });
        toast({ title: "Privacy preset applied", description: `${privacyPreset.titles.length} tweaks enabled` });
      },
    },
    {
      id: "preset-performance", label: "Apply Performance Preset",
      description: "Speed up Windows system-wide",
      category: "Tweaks", icon: Zap, keywords: ["performance", "speed"],
      action: async () => {
        if (!perfPreset) return;
        await bulkMutation.mutateAsync({ titles: perfPreset.titles, isActive: true });
        toast({ title: "Performance preset applied", description: `${perfPreset.titles.length} tweaks enabled` });
      },
    },
    {
      id: "select-all", label: "Select All Tweaks",
      description: "Enable all 47 tweaks at once",
      category: "Tweaks", icon: ChevronRight, keywords: ["enable all"],
      action: async () => {
        await bulkMutation.mutateAsync({ titles: [], isActive: true });
        toast({ title: "All tweaks enabled" });
      },
    },
    {
      id: "clear-all", label: "Clear All Tweaks",
      description: "Disable all currently active tweaks",
      category: "Tweaks", icon: RotateCcw, keywords: ["disable", "reset"],
      action: async () => {
        await bulkMutation.mutateAsync({ titles: [], isActive: false });
        toast({ title: "All tweaks cleared" });
      },
    },

    {
      id: "export-ps1", label: "Export Tweaks Script",
      description: "Download active tweaks as .ps1 file",
      category: "Actions", icon: Download, keywords: ["download", "script", "powershell"],
      action: exportScript,
    },
    {
      id: "export-undo", label: "Generate Undo Script",
      description: "Download reverse/revert script as .ps1",
      category: "Actions", icon: Terminal, keywords: ["undo", "reverse", "revert"],
      action: exportUndo,
    },
    {
      id: "scan-tweaks", label: "Scan System for Tweaks",
      description: "Detect which tweaks are already applied",
      category: "Actions", icon: ScanSearch, keywords: ["detect", "scan"],
      action: () => {
        nav("/tweaks");
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-testid="button-scan-system"]')?.click();
        }, 400);
      },
    },
    {
      id: "scan-cleaner", label: "Scan for Junk Files",
      description: "Run a full cleaner scan",
      category: "Actions", icon: Sparkles, keywords: ["clean", "junk", "temp"],
      action: () => {
        nav("/cleaner");
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-testid="button-scan-now"]')?.click();
        }, 400);
      },
    },
  ];

  const filtered = search.trim()
    ? commands.filter((cmd) => {
        const q = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : commands;

  const grouped: Record<string, Command[]> = {};
  for (const cmd of filtered) {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  }

  useEffect(() => { setSelectedIdx(0); }, [search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIdx]) run(filtered[selectedIdx].action);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIdx]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="p-0 gap-0 bg-card border-border/80 max-w-lg overflow-hidden"
        style={{
          boxShadow: "0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px hsl(var(--border))",
        }}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60"
          style={{ background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--secondary)/0.3) 100%)" }}
        >
          <ScanSearch className="h-4 w-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            data-testid="input-command-palette"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands, pages, tweaks..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="text-[9px] text-muted-foreground/25 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-secondary/30">ESC</kbd>
            <button onClick={close} className="ml-1 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground/30 py-10 font-mono">No commands found</p>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <p className="text-[9px] font-bold text-muted-foreground/25 uppercase tracking-[0.2em] px-4 pt-3 pb-1">
                  {category}
                </p>
                {cmds.map((cmd) => {
                  const flatIdx = filtered.indexOf(cmd);
                  const Icon = cmd.icon;
                  const isSelected = flatIdx === selectedIdx;
                  return (
                    <button
                      key={cmd.id}
                      data-testid={`cmd-${cmd.id}`}
                      onClick={() => run(cmd.action)}
                      onMouseEnter={() => setSelectedIdx(flatIdx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75",
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0 transition-colors",
                        isSelected ? "bg-primary/15" : "bg-secondary/50"
                      )}>
                        <Icon className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          isSelected ? "text-primary" : "text-muted-foreground/50"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[12px] font-semibold leading-none",
                          isSelected ? "text-foreground" : "text-foreground/65"
                        )}>
                          {cmd.label}
                        </p>
                        {cmd.description && (
                          <p className="text-[10px] text-muted-foreground/35 mt-0.5 leading-snug">
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="h-3 w-3 text-primary/40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-secondary/10">
          <div className="flex items-center gap-3.5">
            <span className="text-[9px] text-muted-foreground/25 font-mono">↑↓ navigate</span>
            <span className="text-[9px] text-muted-foreground/25 font-mono">↵ select</span>
            <span className="text-[9px] text-muted-foreground/25 font-mono">esc close</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="text-[9px] text-muted-foreground/25 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-secondary/30">Ctrl</kbd>
            <span className="text-[9px] text-muted-foreground/15 mx-0.5">+</span>
            <kbd className="text-[9px] text-muted-foreground/25 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-secondary/30">K</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
