import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { createRestorePoint, runUtility } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, History, Terminal, Info, Loader2, CheckCircle2 } from "lucide-react";

export default function RestorePoints() {
  const { toast } = useToast();
  const [restoreName, setRestoreName] = useState("JGoode A.I.O - Pre-Optimization");
  const [showManual, setShowManual] = useState(false);
  const [created, setCreated] = useState(false);

  const createMutation = useMutation({
    mutationFn: (name: string) => createRestorePoint(name) as Promise<{ message: string }>,
    onSuccess: (data) => {
      setCreated(true);
      toast({ title: "Restore Point Created", description: data.message });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const openRestoreMutation = useMutation({
    mutationFn: () => runUtility("open-system-restore"),
    onSuccess: () => {
      toast({ title: "System Restore Opened", description: "The Windows System Restore wizard is launching." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed", description: "Could not open System Restore. Try running rstrui.exe manually." });
    },
  });

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-page-header">
          Restore <span className="text-primary">Points</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Always create a restore point before applying tweaks</p>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 p-3.5 rounded-xl border border-primary/15 bg-primary/5"
      >
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          A System Restore Point is a snapshot of your Windows system files, registry, and settings. It lets you
          revert your PC to a previous state if something goes wrong after applying tweaks.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="p-5 rounded-xl border border-border bg-card space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-[13px] text-foreground">Create Restore Point</h2>
              <p className="text-[11px] text-muted-foreground">Requires Administrator privileges</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restore-name" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Name
            </Label>
            <Input
              id="restore-name"
              data-testid="input-restore-name"
              value={restoreName}
              onChange={(e) => { setRestoreName(e.target.value); setCreated(false); }}
              className="h-8 bg-secondary border-border/60 text-sm"
              placeholder="Enter a descriptive name..."
            />
          </div>

          <Button
            data-testid="button-create-restore-point"
            onClick={() => createMutation.mutate(restoreName)}
            disabled={createMutation.isPending || !restoreName.trim()}
            className="w-full h-8 bg-primary text-white font-semibold text-sm"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : created ? (
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="mr-2 h-3.5 w-3.5" />
            )}
            {createMutation.isPending ? "Creating..." : created ? "Point Created" : "Create Restore Point"}
          </Button>
        </motion.div>

        {/* Open System Restore */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="p-5 rounded-xl border border-border bg-card space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <History className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-[13px] text-foreground">System Restore Wizard</h2>
              <p className="text-[11px] text-muted-foreground">Open Windows System Restore GUI</p>
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Open the Windows System Restore wizard to roll back to a previous restore point or manage existing ones.
          </p>

          <Button
            data-testid="button-open-system-restore"
            onClick={() => openRestoreMutation.mutate()}
            disabled={openRestoreMutation.isPending}
            variant="outline"
            className="w-full h-8 border-border/60 hover:border-primary/30 text-sm font-semibold"
          >
            {openRestoreMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Open System Restore
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowManual(!showManual)}
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {showManual ? "Hide" : "Manual Steps (Win + R)"}
          </Button>

          {showManual && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-secondary/60 border border-border/40 text-xs text-muted-foreground space-y-2"
            >
              <p className="font-semibold text-foreground text-[11px]">Manual Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>Press <kbd className="bg-card border border-border px-1.5 py-0.5 rounded text-[10px] font-mono">Win + R</kbd></li>
                <li>Type <code className="text-primary font-mono">rstrui.exe</code> and press Enter</li>
                <li>Follow the System Restore wizard</li>
              </ol>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* PowerShell reference */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl border border-border/60 bg-secondary/20 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PowerShell — List Restore Points</span>
        </div>
        <code className="block text-sm font-mono text-primary bg-card border border-border px-4 py-2.5 rounded-lg">
          Get-ComputerRestorePoint
        </code>
      </motion.div>

      {/* Note */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border-l-4 border-primary bg-card">
        <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          <span className="text-primary font-bold">Important:</span> Restore points require{" "}
          <span className="text-foreground font-semibold">Administrator privileges</span>. System Protection must be enabled
          on drive <span className="text-primary font-semibold">C:</span> for restore points to work.
        </p>
      </div>
    </div>
  );
}
