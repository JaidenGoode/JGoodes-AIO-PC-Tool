import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStartupItems, toggleStartupItem, type StartupItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  MonitorCheck, RefreshCw, Loader2, ShieldAlert,
  MonitorPlay, FolderOpen, AppWindow, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<string, { label: string; short: string; icon: React.ElementType; color: string }> = {
  "HKCU\\Run":    { label: "User Run Key",       short: "User Run",     icon: AppWindow,    color: "bg-primary/10 text-primary border-primary/20" },
  "HKLM\\Run":    { label: "System Run Key",      short: "System Run",   icon: AppWindow,    color: "bg-muted text-muted-foreground border-border" },
  "Startup\\User":{ label: "User Startup Folder", short: "User Folder",  icon: FolderOpen,   color: "bg-primary/10 text-primary border-primary/20" },
  "Startup\\All": { label: "System Startup Folder", short: "Sys Folder", icon: FolderOpen,   color: "bg-muted text-muted-foreground border-border" },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-muted rounded w-40" />
        <div className="h-2.5 bg-muted/60 rounded w-64" />
      </div>
      <div className="w-10 h-5 bg-muted rounded-full shrink-0" />
    </div>
  );
}

function StartupRow({
  item,
  onToggle,
  toggling,
}: {
  item: StartupItem;
  onToggle: (item: StartupItem, newEnabled: boolean) => void;
  toggling: boolean;
}) {
  const meta = SOURCE_META[item.source] ?? {
    label: item.source, short: item.source, icon: AppWindow, color: "bg-muted text-muted-foreground border-border",
  };
  const SrcIcon = meta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors duration-150",
        item.enabled ? "hover:bg-primary/3" : "hover:bg-muted/30 opacity-70"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
        item.enabled ? "bg-primary/10" : "bg-muted"
      )}>
        <SrcIcon className={cn("h-4 w-4", item.enabled ? "text-primary" : "text-muted-foreground")} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-[13px] font-semibold truncate transition-colors",
            item.enabled ? "text-foreground" : "text-muted-foreground"
          )}
            data-testid={`text-startup-name-${item.name}`}
          >
            {item.name}
          </span>
          <span className={cn(
            "inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0",
            meta.color
          )}>
            {meta.short}
          </span>
          {item.requiresAdmin && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0 bg-amber-500/10 text-amber-500 border-amber-500/20">
              <ShieldAlert className="h-2.5 w-2.5" />
              Admin
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5 truncate" title={item.command}>
          {item.command}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wide transition-colors hidden sm:block",
          item.enabled ? "text-primary" : "text-muted-foreground/40"
        )}>
          {item.enabled ? "On" : "Off"}
        </span>
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={item.enabled}
            onCheckedChange={(checked) => onToggle(item, checked)}
            data-testid={`switch-startup-${item.name}`}
            className="data-[state=checked]:bg-primary"
          />
        )}
      </div>
    </motion.div>
  );
}

export default function Startup() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/startup"],
    queryFn: getStartupItems,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, source, enabled }: { name: string; source: string; enabled: boolean }) =>
      toggleStartupItem(name, source, enabled),
    onSuccess: (_data, vars) => {
      qc.setQueryData<StartupItem[]>(["/api/startup"], (prev = []) =>
        prev.map((it) => it.name === vars.name && it.source === vars.source
          ? { ...it, enabled: vars.enabled }
          : it
        )
      );
      toast({
        title: vars.enabled ? "Startup item enabled" : "Startup item disabled",
        description: `${vars.name} will ${vars.enabled ? "run" : "not run"} at next startup.`,
      });
    },
    onError: (err: Error, vars) => {
      toast({ title: "Toggle failed", description: err.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["/api/startup"] });
    },
    onSettled: (_d, _e, vars) => {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(`${vars.source}::${vars.name}`);
        return next;
      });
    },
  });

  const handleToggle = useCallback((item: StartupItem, newEnabled: boolean) => {
    const key = `${item.source}::${item.name}`;
    setTogglingKeys((prev) => new Set(prev).add(key));
    toggleMutation.mutate({ name: item.name, source: item.source, enabled: newEnabled });
  }, [toggleMutation]);

  const enabledCount  = items.filter((i) => i.enabled).length;
  const disabledCount = items.filter((i) => !i.enabled).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <MonitorCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-[16px] font-black text-foreground tracking-tight">Startup Manager</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                View and control which programs launch when Windows starts.
                Disabling an item is fully reversible — nothing is deleted.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 h-8 text-xs border-border/60 hover:border-primary/40 hover:text-primary transition-all"
            data-testid="button-startup-refresh"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Summary strip */}
        {!isLoading && !isError && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{items.length}</span> startup items found
            </div>
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              {enabledCount} enabled
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <XCircle className="h-3 w-3" />
              {disabledCount} disabled
            </div>
          </motion.div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="divide-y divide-border/30">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-8">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Failed to load startup items</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Run as Administrator and try refreshing.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}
              className="text-xs border-border/60 hover:border-primary/40 hover:text-primary">
              <RefreshCw className="h-3 w-3 mr-1.5" /> Try Again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-8">
            <div className="p-3 rounded-full bg-muted">
              <MonitorPlay className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">No startup items found</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                No programs are registered to launch at startup on this user account.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-b-xl overflow-hidden">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <StartupRow
                  key={`${item.source}::${item.name}`}
                  item={item}
                  onToggle={handleToggle}
                  toggling={togglingKeys.has(`${item.source}::${item.name}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Safety footer */}
      <div className="flex-none px-4 py-2.5 border-t border-border/40 flex items-center gap-2">
        <CheckCircle2 className="h-3 w-3 text-primary/60 shrink-0" />
        <p className="text-[10px] text-muted-foreground/50">
          Safe — uses Windows StartupApproved (same as Task Manager). Original entries are never deleted. Changes take effect after next restart.
        </p>
      </div>
    </div>
  );
}
