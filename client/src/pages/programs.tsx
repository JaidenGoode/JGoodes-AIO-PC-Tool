import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, Trash2, RefreshCw, Loader2, AlertTriangle,
  SortAsc, Calendar, HardDrive, Building2, ExternalLink, X, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { openUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

type InstalledProgram = {
  name: string;
  version: string;
  publisher: string;
  installDate: string;
  sizeMB: number;
  uninstallString: string;
  quietUninstall: string;
  isMsi: boolean;
  msiGuid: string;
};

type ProgramsResult = {
  programs: InstalledProgram[];
  total: number;
  totalSizeMB: number;
};

type SortKey = "name" | "size" | "publisher" | "date";

function fmtSize(mb: number): string {
  if (!mb || mb === 0) return "—";
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function fmtDate(raw: string): string {
  if (!raw || raw.length < 8) return "—";
  const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mo = months[parseInt(m, 10) - 1] || m;
  return `${mo} ${d}, ${y}`;
}

function Monogram({ name }: { name: string }) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-base select-none"
      style={{
        background: `hsl(var(--primary) / 0.15)`,
        border: `1px solid hsl(var(--primary) / 0.25)`,
        boxShadow: `0 0 12px hsl(var(--primary) / 0.1)`,
        color: `hsl(var(--primary))`,
      }}
    >
      {letter}
    </div>
  );
}

function ProgramCard({
  prog, index, onUninstall, onReinstall, uninstalling, reinstalling,
}: {
  prog: InstalledProgram;
  index: number;
  onUninstall: (p: InstalledProgram) => void;
  onReinstall: (p: InstalledProgram) => void;
  uninstalling: boolean;
  reinstalling: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.18 }}
    >
      <div
        className="flex flex-col rounded-xl border border-border/70 bg-card overflow-hidden group relative transition-all duration-200"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 22px hsl(var(--primary) / 0.1), 0 4px 18px rgba(0,0,0,0.4)";
          (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
          (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.7)";
        }}
      >
        {/* Gradient top accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Card body */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <Monogram name={prog.name} />
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-[12.5px] text-foreground leading-tight truncate"
              data-testid={`text-program-name-${index}`}
              title={prog.name}
            >
              {prog.name}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate" title={prog.publisher || "Unknown publisher"}>
              {prog.publisher || "Unknown publisher"}
            </p>
          </div>
        </div>

        {/* Meta strip */}
        <div className="flex items-center gap-0 px-4 pb-3 flex-wrap gap-y-1">
          {prog.version && (
            <span className="text-[9.5px] font-mono font-semibold text-primary/70 bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-md mr-2">
              v{prog.version}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 mr-3">
            <HardDrive className="h-2.5 w-2.5 shrink-0" />
            {fmtSize(prog.sizeMB)}
          </span>
          {prog.installDate && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              {fmtDate(prog.installDate)}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-[1px] bg-border/30 mb-3" />

        {/* Action buttons */}
        <div className="flex items-center gap-2 px-3 pb-3">
          <Button
            size="sm"
            disabled={uninstalling || reinstalling}
            onClick={() => onUninstall(prog)}
            data-testid={`button-uninstall-${index}`}
            className={cn(
              "flex-1 h-7 text-[11px] font-semibold gap-1.5 transition-all duration-150 border",
              "bg-red-950/30 hover:bg-red-900/40 text-red-400/70 hover:text-red-300 border-red-900/30 hover:border-red-800/50"
            )}
          >
            {uninstalling ? <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" /> : <Trash2 className="h-2.5 w-2.5 shrink-0" />}
            {uninstalling ? "Removing..." : "Uninstall"}
          </Button>
          <Button
            size="sm"
            disabled={uninstalling || reinstalling}
            onClick={() => onReinstall(prog)}
            data-testid={`button-reinstall-${index}`}
            className={cn(
              "flex-1 h-7 text-[11px] font-semibold gap-1.5 transition-all duration-150 border",
              "bg-secondary/20 hover:bg-primary/8 text-foreground/50 hover:text-primary border-border/30 hover:border-primary/30"
            )}
          >
            {reinstalling
              ? <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
              : prog.isMsi
                ? <RefreshCw className="h-2.5 w-2.5 shrink-0" />
                : <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            }
            {reinstalling ? "Working..." : prog.isMsi ? "Reinstall" : "Re-download"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-border/40 bg-card/60 overflow-hidden"
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-xl bg-secondary/40 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-3/4 rounded bg-secondary/40 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-secondary/30 animate-pulse" />
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-2">
        <div className="h-4 w-12 rounded bg-secondary/30 animate-pulse" />
        <div className="h-4 w-14 rounded bg-secondary/20 animate-pulse" />
      </div>
      <div className="mx-4 h-[1px] bg-border/20 mb-3" />
      <div className="flex gap-2 px-3 pb-3">
        <div className="flex-1 h-7 rounded-md bg-secondary/30 animate-pulse" />
        <div className="flex-1 h-7 rounded-md bg-secondary/20 animate-pulse" />
      </div>
    </motion.div>
  );
}

export default function Programs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [confirmProg, setConfirmProg] = useState<InstalledProgram | null>(null);
  const [activeUninstall, setActiveUninstall] = useState<string | null>(null);
  const [activeReinstall, setActiveReinstall] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ProgramsResult>({
    queryKey: ["/api/programs"],
    staleTime: 1000 * 60 * 5,
  });

  const uninstallMutation = useMutation({
    mutationFn: (prog: InstalledProgram) =>
      apiRequest("POST", "/api/programs/uninstall", {
        uninstallString: prog.uninstallString,
        quietUninstall: prog.quietUninstall,
        isMsi: prog.isMsi,
        msiGuid: prog.msiGuid,
        programName: prog.name,
      }),
    onMutate: (prog) => setActiveUninstall(prog.name),
    onSuccess: (_data, prog) => {
      setActiveUninstall(null);
      toast({ title: "Uninstalled", description: `${prog.name} was removed successfully.` });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: (err: any, prog) => {
      setActiveUninstall(null);
      toast({ title: "Uninstall failed", description: err?.message || "Could not remove the program.", variant: "destructive" });
    },
  });

  const reinstallMutation = useMutation({
    mutationFn: (prog: InstalledProgram) =>
      apiRequest("POST", "/api/programs/reinstall", {
        isMsi: prog.isMsi,
        msiGuid: prog.msiGuid,
        programName: prog.name,
      }),
    onMutate: (prog) => setActiveReinstall(prog.name),
    onSuccess: (result: any, prog) => {
      setActiveReinstall(null);
      if (result?.method === "browser") {
        openUrl(result.searchUrl);
        toast({ title: "Re-download", description: `Opening search for "${prog.name}" in your browser.` });
      } else {
        toast({ title: "Reinstalled", description: `${prog.name} repair/reinstall completed.` });
        queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      }
    },
    onError: (err: any, prog) => {
      setActiveReinstall(null);
      toast({ title: "Reinstall failed", description: err?.message || "Could not reinstall.", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    const progs = data?.programs ?? [];
    const q = search.toLowerCase().trim();
    const out = q
      ? progs.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.publisher || "").toLowerCase().includes(q)
        )
      : progs;
    return [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return (b.sizeMB || 0) - (a.sizeMB || 0);
      if (sort === "publisher") return (a.publisher || "").localeCompare(b.publisher || "");
      if (sort === "date") return (b.installDate || "").localeCompare(a.installDate || "");
      return 0;
    });
  }, [data, search, sort]);

  const totalSizeStr = useMemo(() => {
    const mb = data?.totalSizeMB ?? 0;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  }, [data]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-5 border-b border-border/50 bg-card/40"
        style={{ borderImage: "linear-gradient(to right, transparent, hsl(var(--primary)/0.15), transparent) 1" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                border: "1px solid hsl(var(--primary) / 0.25)",
                boxShadow: "0 0 20px hsl(var(--primary) / 0.15)",
              }}
            >
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-black text-lg text-foreground tracking-tight leading-none">Programs</h1>
              <p className="text-[11px] text-muted-foreground/45 mt-1 font-mono">
                {isLoading ? "Scanning installed programs..." : `${data?.total ?? 0} programs detected`}
              </p>
            </div>
          </div>

          {/* Stats chips */}
          {!isLoading && data && (
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono"
                style={{ background: "hsl(var(--primary)/0.06)", borderColor: "hsl(var(--primary)/0.18)", color: "hsl(var(--primary)/0.8)" }}
              >
                <Package className="h-2.5 w-2.5" />
                {data.total}
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono"
                style={{ background: "hsl(var(--primary)/0.06)", borderColor: "hsl(var(--primary)/0.18)", color: "hsl(var(--primary)/0.8)" }}
              >
                <HardDrive className="h-2.5 w-2.5" />
                {totalSizeStr}
              </div>
            </div>
          )}
        </div>

        {/* Search + Sort controls */}
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/35 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs or publishers..."
              data-testid="input-programs-search"
              className="pl-9 pr-8 h-9 text-[12px] bg-secondary/15 border-border/40 focus:border-primary/40 placeholder:text-muted-foreground/25"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              data-testid="select-programs-sort"
              className="w-36 h-9 text-[11px] bg-secondary/15 border-border/40 focus:border-primary/40"
            >
              <SortAsc className="h-3 w-3 text-muted-foreground/40 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="size">Largest First</SelectItem>
              <SelectItem value="publisher">Publisher</SelectItem>
              <SelectItem value="date">Install Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search result count */}
        {search && !isLoading && (
          <p className="text-[10px] text-muted-foreground/35 mt-2 font-mono">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </p>
        )}
      </div>

      {/* ── Program Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {search ? (
              <>
                <Search className="h-10 w-10 text-muted-foreground/15 mb-4" />
                <p className="text-sm font-semibold text-foreground/40">No programs match "{search}"</p>
                <p className="text-xs text-muted-foreground/25 mt-1">Try a different name or publisher</p>
              </>
            ) : (
              <>
                <Package className="h-10 w-10 text-muted-foreground/15 mb-4" />
                <p className="text-sm font-semibold text-foreground/40">No programs detected</p>
                <p className="text-xs text-muted-foreground/25 mt-1">
                  Program detection only works on Windows
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence>
              {filtered.map((prog, i) => (
                <ProgramCard
                  key={prog.name + prog.version}
                  prog={prog}
                  index={i}
                  onUninstall={(p) => setConfirmProg(p)}
                  onReinstall={(p) => reinstallMutation.mutate(p)}
                  uninstalling={activeUninstall === prog.name}
                  reinstalling={activeReinstall === prog.name}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Uninstall Confirm Dialog ──────────────────────────────────────────── */}
      <AlertDialog open={!!confirmProg} onOpenChange={(open) => { if (!open) setConfirmProg(null); }}>
        <AlertDialogContent className="border-border/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-black">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(0 80% 30% / 0.3)", border: "1px solid hsl(0 70% 40% / 0.4)" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              </div>
              Uninstall Program
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/60 text-[12.5px] leading-relaxed">
              Are you sure you want to uninstall{" "}
              <span className="text-foreground/80 font-semibold">{confirmProg?.name}</span>?
              {confirmProg?.publisher && (
                <> by <span className="text-foreground/60">{confirmProg.publisher}</span></>
              )}
              <br />
              <span className="text-red-400/70 text-[11px]">This action cannot be undone — the program will be permanently removed.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="button-uninstall-cancel"
              className="h-8 text-[12px] border-border/40"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-uninstall-confirm"
              onClick={() => {
                if (confirmProg) {
                  uninstallMutation.mutate(confirmProg);
                  setConfirmProg(null);
                }
              }}
              className="h-8 text-[12px] font-semibold bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-800/60"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
