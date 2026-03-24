import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Shield, Download, Zap, CheckCircle2, AlertTriangle,
  Loader2, PackageX, Info, FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    electronAPI?: {
      runScript: (script: string) => Promise<{ success: boolean; code: number }>;
      onScriptOutput: (callback: (data: { type: string; text?: string; code?: number }) => void) => () => void;
    };
  }
}

type LaunchStatus = "idle" | "running" | "launching" | "downloading" | "done" | "error";

function LaunchBtn({
  onClick, disabled, status, label, icon: Icon, testId,
}: {
  onClick: () => void; disabled: boolean; status: LaunchStatus;
  label: string; icon?: React.ElementType; testId: string;
}) {
  const busy = disabled && status !== "done" && status !== "error";
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-9 text-xs font-bold transition-all duration-200 gap-2 relative overflow-hidden",
        status === "done"
          ? "bg-green-500/12 border border-green-500/30 text-green-400 hover:bg-green-500/18"
          : status === "error"
          ? "bg-destructive/12 border border-destructive/30 text-destructive hover:bg-destructive/18"
          : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/0"
      )}
      style={(!busy && status !== "done" && status !== "error") ? {
        boxShadow: "0 0 16px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.3)",
      } : undefined}
      data-testid={testId}
    >
      {busy
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...</>
        : status === "done"
        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Launched Successfully</>
        : status === "error"
        ? <><AlertTriangle className="h-3.5 w-3.5" /> Launch Failed — Retry</>
        : <>{Icon && <Icon className="h-3.5 w-3.5" />}{label}</>}
    </Button>
  );
}

function DebloatCard({
  icon: Icon, title, tag, description, children,
}: {
  icon: React.ElementType;
  title: string;
  tag: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-xl border border-border/70 bg-card hover:border-primary/35 transition-all duration-200 overflow-hidden group relative h-full"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px hsl(var(--primary) / 0.12), 0 4px 18px rgba(0,0,0,0.4)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)"; }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4 border-b border-border/40 bg-secondary/8 shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
          style={{
            background: "hsl(var(--primary) / 0.1)",
            borderColor: "hsl(var(--primary) / 0.22)",
            boxShadow: "0 0 14px hsl(var(--primary) / 0.12)",
          }}
        >
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-[13.5px] text-foreground tracking-tight leading-tight">{title}</h3>
            <span
              className="text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full border shrink-0"
              style={{ color: "hsl(var(--primary) / 0.85)", background: "hsl(var(--primary) / 0.08)", borderColor: "hsl(var(--primary) / 0.2)" }}
            >
              {tag}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">{description}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 space-y-3">{children}</div>
    </div>
  );
}

function InfoBox({ type, children }: { type: "warn" | "info" | "tip"; children: React.ReactNode }) {
  const styles = {
    warn: { bg: "bg-amber-500/8", border: "border-amber-500/20", icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />, text: "text-amber-400/80" },
    info: { bg: "bg-blue-500/8", border: "border-blue-500/20", icon: <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />, text: "text-blue-400/80" },
    tip:  { bg: "bg-secondary/60", border: "border-border/40", icon: <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />, text: "text-muted-foreground/70" },
  }[type];

  return (
    <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", styles.bg, styles.border)}>
      {styles.icon}
      <p className={cn("text-[10.5px] leading-relaxed", styles.text)}>{children}</p>
    </div>
  );
}

// ── Profile file constants (base64-encoded, decoded at runtime) ─────────────
const CTT_PRESET_B64 = "ewogICJXUEZJbnN0YWxsIjogW10sCiAgIldQRlR3ZWFrcyI6IFsKICAgICJXUEZUd2Vha3NBY3Rpdml0eSIsCiAgICAiV1BGVHdlYWtzQ29uc3VtZXJGZWF0dXJlcyIsCiAgICAiV1BGVHdlYWtzV1BCVCIsCiAgICAiV1BGVHdlYWtzRFZSIiwKICAgICJXUEZUd2Vha3NTZXJ2aWNlcyIsCiAgICAiV1BGVHdlYWtzRW5kVGFza09uVGFza2JhciIsCiAgICAiV1BGVHdlYWtzRGlzYWJsZUV4cGxvcmVyQXV0b0Rpc2NvdmVyeSIsCiAgICAiV1BGVHdlYWtzUG93ZXJzaGVsbDdUZWxlIiwKICAgICJXUEZUd2Vha3NUZWxlbWV0cnkiLAogICAgIldQRlR3ZWFrc1dpZGdldCIsCiAgICAiV1BGVHdlYWtzRGlzYWJsZUJHYXBwcyIsCiAgICAiV1BGVHdlYWtzRGlzcGxheSIsCiAgICAiV1BGVHdlYWtzUmlnaHRDbGlja01lbnUiLAogICAgIldQRlR3ZWFrc1JlbW92ZU9uZURyaXZlIiwKICAgICJXUEZUd2Vha3NSZW1vdmVIb21lIiwKICAgICJXUEZUd2Vha3NSZW1vdmVHYWxsZXJ5IiwKICAgICJXUEZUd2Vha3NJUHY0NiIKICBdLAogICJXUEZGZWF0dXJlIjogW10KfQ==";
const SHUTUP10_CFG_B64 = "IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIwojIFRoaXMgZmlsZSB3YXMgY3JlYXRlZCB3aXRoIE8mTyBTaHV0VXAxMCsrIFYyLjIuMTAyNAojIGFuZCBjYW4gYmUgaW1wb3J0ZWQgb250byBhbm90aGVyIGNvbXB1dGVyLiAKIwojIERvd25sb2FkIHRoZSBhcHBsaWNhdGlvbiBhdCBodHRwczovL3d3dy5vby1zb2Z0d2FyZS5jb20vc2h1dHVwMTAKIyBZb3UgY2FuIHRoZW4gaW1wb3J0IHRoZSBmaWxlIGZyb20gd2l0aGluIHRoZSBwcm9ncmFtLiAKIwojIEFsdGVybmF0aXZlbHkgeW91IGNhbiBpbXBvcnQgaXQgYXV0b21hdGljYWxseSBvdmVyIGEgY29tbWFuZCBsaW5lLgojIFNpbXBseSB1c2UgdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXI6IAojIE9PU1UxMC5leGUgPHBhdGggdG8gZmlsZT4KIyAKIyBTZWxlY3RpbmcgdGhlIE9wdGlvbiAvcXVpZXQgZW5kcyB0aGUgYXBwIHJpZ2h0IGFmdGVyIHRoZSBpbXBvcnQgYW5kIHRoZQojIHVzZXIgZG9lcyBub3QgZ2V0IGFueSBmZWVkYmFjayBhYm91dCB0aGUgaW1wb3J0LgojCiMgV2UgYXJlIGFsd2F5cyBoYXBweSB0byBhbnN3ZXIgYW55IHF1ZXN0aW9ucyB5b3UgbWF5IGhhdmUhCiMgwqkgMjAxNS0yMDI2IE8mTyBTb2Z0d2FyZSBHbWJILCBCZXJsaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuCiMgaHR0cHM6Ly93d3cub28tc29mdHdhcmUuY29tLwojIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjCgpQMDAxCSsJIyBEaXNhYmxlIHNoYXJpbmcgb2YgaGFuZHdyaXRpbmcgZGF0YSAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwMDIJKwkjIERpc2FibGUgc2hhcmluZyBvZiBoYW5kd3JpdGluZyBlcnJvciByZXBvcnRzIChDYXRlZ29yeTogUHJpdmFjeSkKUDAwMwkrCSMgRGlzYWJsZSBJbnZlbnRvcnkgQ29sbGVjdG9yIChDYXRlZ29yeTogUHJpdmFjeSkKUDAwNAkrCSMgRGlzYWJsZSBjYW1lcmEgaW4gbG9nb24gc2NyZWVuIChDYXRlZ29yeTogUHJpdmFjeSkKUDAwNQkrCSMgRGlzYWJsZSBhbmQgcmVzZXQgQWR2ZXJ0aXNpbmcgSUQgYW5kIGluZm8gKENhdGVnb3J5OiBQcml2YWN5KQpQMDA2CSsJIyBEaXNhYmxlIGFuZCByZXNldCBBZHZlcnRpc2luZyBJRCBhbmQgaW5mbyAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwMDgJKwkjIERpc2FibGUgdHJhbnNtaXNzaW9uIG9mIHR5cGluZyBpbmZvcm1hdGlvbiAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwMjYJKwkjIERpc2FibGUgYWR2ZXJ0aXNlbWVudHMgdmlhIEJsdWV0b290aCAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwMjcJKwkjIERpc2FibGUgdGhlIFdpbmRvd3MgQ3VzdG9tZXIgRXhwZXJpZW5jZSBJbXByb3ZlbWVudCBQcm9ncmFtIChDYXRlZ29yeTogUHJpdmFjeSkKUDAyOAkrCSMgRGlzYWJsZSBiYWNrdXAgb2YgdGV4dCBtZXNzYWdlcyBpbnRvIHRoZSBjbG91ZCAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwNjQJKwkjIERpc2FibGUgc3VnZ2VzdGlvbnMgaW4gdGhlIHRpbWVsaW5lIChDYXRlZ29yeTogUHJpdmFjeSkKUDA2NQkrCSMgRGlzYWJsZSBzdWdnZXN0aW9ucyBpbiBTdGFydCAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwNjYJKwkjIERpc2FibGUgdGlwcywgdHJpY2tzLCBhbmQgc3VnZ2VzdGlvbnMgd2hlbiB1c2luZyBXaW5kb3dzIChDYXRlZ29yeTogUHJpdmFjeSkKUDA2NwkrCSMgRGlzYWJsZSBzaG93aW5nIHN1Z2dlc3RlZCBjb250ZW50IGluIHRoZSBTZXR0aW5ncyBhcHAgKENhdGVnb3J5OiBQcml2YWN5KQpQMDcwCSsJIyBEaXNhYmxlIHRoZSBwb3NzaWJpbGl0eSBvZiBzdWdnZXN0aW5nIHRvIGZpbmlzaCB0aGUgc2V0dXAgb2YgdGhlIGRldmljZSAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwNjkJKwkjIERpc2FibGUgV2luZG93cyBFcnJvciBSZXBvcnRpbmcgKENhdGVnb3J5OiBQcml2YWN5KQpQMDA5CS0JIyBEaXNhYmxlIGJpb21ldHJpY2FsIGZlYXR1cmVzIChDYXRlZ29yeTogUHJpdmFjeSkKUDAxMAkrCSMgRGlzYWJsZSBhcHAgbm90aWZpY2F0aW9ucyAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwMTUJKwkjIERpc2FibGUgYWNjZXNzIHRvIGxvY2FsIGxhbmd1YWdlIGZvciBicm93c2VycyAoQ2F0ZWdvcnk6IFByaXZhY3kpClAwNjgJLQkjIERpc2FibGUgdGV4dCBzdWdnZXN0aW9ucyB3aGVuIHR5cGluZyBvbiB0aGUgc29mdHdhcmUga2V5Ym9hcmQgKENhdGVnb3J5OiBQcml2YWN5KQpQMDE2CS0JIyBEaXNhYmxlIHNlbmRpbmcgVVJMcyBmcm9tIGFwcHMgdG8gV2luZG93cyBTdG9yZSAoQ2F0ZWdvcnk6IFByaXZhY3kpCkEwMDEJKwkjIERpc2FibGUgcmVjb3JkaW5ncyBvZiB1c2VyIGFjdGl2aXR5IChDYXRlZ29yeTogQWN0aXZpdHkgSGlzdG9yeSBhbmQgQ2xpcGJvYXJkKQpBMDAyCSsJIyBEaXNhYmxlIHN0b3JpbmcgdXNlcnMnIGFjdGl2aXR5IGhpc3RvcnkgKENhdGVnb3J5OiBBY3Rpdml0eSBIaXN0b3J5IGFuZCBDbGlwYm9hcmQpCkEwMDMJKwkjIERpc2FibGUgdGhlIHN1Ym1pc3Npb24gb2YgdXNlciBhY3Rpdml0aWVzIHRvIE1pY3Jvc29mdCAoQ2F0ZWdvcnk6IEFjdGl2aXR5IEhpc3RvcnkgYW5kIENsaXBib2FyZCkKQTAwNAkrCSMgRGlzYWJsZSBzdG9yYWdlIG9mIGNsaXBib2FyZCBoaXN0b3J5IChDYXRlZ29yeTogQWN0aXZpdHkgSGlzdG9yeSBhbmQgQ2xpcGJvYXJkKQpBMDA2CSsJIyBEaXNhYmxlIHN0b3JhZ2Ugb2YgY2xpcGJvYXJkIGhpc3RvcnkgKENhdGVnb3J5OiBBY3Rpdml0eSBIaXN0b3J5IGFuZCBDbGlwYm9hcmQpCkEwMDUJKwkjIERpc2FibGUgdGhlIHRyYW5zZmVyIG9mIHRoZSBjbGlwYm9hcmQgdG8gb3RoZXIgZGV2aWNlcyB2aWEgdGhlIGNsb3VkIChDYXRlZ29yeTogQWN0aXZpdHkgSGlzdG9yeSBhbmQgQ2xpcGJvYXJkKQpQMTA3CSsJIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gdXNlciBhY2NvdW50IGluZm9ybWF0aW9uIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMzYJKwkjIERpc2FibGUgYXBwIGFjY2VzcyB0byB1c2VyIGFjY291bnQgaW5mb3JtYXRpb24gKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDAyNQkrCSMgRGlzYWJsZSBXaW5kb3dzIHRyYWNraW5nIG9mIGFwcCBzdGFydHMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDAzMwkrCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGRpYWdub3N0aWNzIGluZm9ybWF0aW9uIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMjMJKwkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBkaWFnbm9zdGljcyBpbmZvcm1hdGlvbiAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDU2CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gZGV2aWNlIGxvY2F0aW9uIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNTcJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBkZXZpY2UgbG9jYXRpb24gKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDExMgktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGNhbWVyYSAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDM0CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gY2FtZXJhIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAxMTMJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBtaWNyb3Bob25lIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMzUJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBtaWNyb3Bob25lIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNjIJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byB1c2Ugdm9pY2UgYWN0aXZhdGlvbiAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDYzCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gdXNlIHZvaWNlIGFjdGl2YXRpb24gd2hlbiBkZXZpY2UgaXMgbG9ja2VkIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwODEJLQkjIERpc2FibGUgdGhlIHN0YW5kYXJkIGFwcCBmb3IgdGhlIGhlYWRzZXQgYnV0dG9uIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNDcJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBub3RpZmljYXRpb25zIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMTkJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBub3RpZmljYXRpb25zIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNDgJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBtb3ZlbWVudHMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA0OQktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIG1vdmVtZW50cyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMTIwCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gY29udGFjdHMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDAzNwktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGNvbnRhY3RzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAxMTEJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBjYWxlbmRhciAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDM4CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gY2FsZW5kYXIgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA1MAktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIHBob25lIGNhbGxzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNTEJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBwaG9uZSBjYWxscyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMTE4CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gY2FsbCBoaXN0b3J5IChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMzkJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBjYWxsIGhpc3RvcnkgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDAyMQktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGVtYWlsIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNDAJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBlbWFpbCAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDIyCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gdGFza3MgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA0MQktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIHRhc2tzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAxMTQJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBtZXNzYWdlcyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDQyCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gbWVzc2FnZXMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA1MgktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIHdpcmVsZXNzIGNvbm5lY3Rpb25zIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNTMJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byB3aXJlbGVzcyBjb25uZWN0aW9ucyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDU0CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gbG9vc2VseSBjb3VwbGVkIGRldmljZXMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA1NQktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGxvb3NlbHkgY291cGxlZCBkZXZpY2VzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMjkJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBkb2N1bWVudHMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA0MwktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIGRvY3VtZW50cyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDMwCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gaW1hZ2VzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNDQJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBpbWFnZXMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDAzMQktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIHZpZGVvcyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDQ1CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gdmlkZW9zIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwMzIJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byB0aGUgZmlsZSBzeXN0ZW0gKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA0NgktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIHRoZSBmaWxlIHN5c3RlbSAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDU4CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gd2lyZWxlc3MgdGVjaG5vbG9neSAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDU5CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gd2lyZWxlc3MgdGVjaG5vbG9neSAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDYwCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gZXllIHRyYWNraW5nIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNjEJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBleWUgdHJhY2tpbmcgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA3MQktCSMgRGlzYWJsZSB0aGUgYWJpbGl0eSBmb3IgYXBwcyB0byB0YWtlIHNjcmVlbnNob3RzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNzIJLQkjIERpc2FibGUgdGhlIGFiaWxpdHkgZm9yIGFwcHMgdG8gdGFrZSBzY3JlZW5zaG90cyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDczCS0JIyBEaXNhYmxlIHRoZSBhYmlsaXR5IGZvciBkZXNrdG9wIGFwcHMgdG8gdGFrZSBzY3JlZW5zaG90cyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDc0CS0JIyBEaXNhYmxlIHRoZSBhYmlsaXR5IGZvciBhcHBzIHRvIHRha2Ugc2NyZWVuc2hvdHMgd2l0aG91dCBib3JkZXJzIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNzUJLQkjIERpc2FibGUgdGhlIGFiaWxpdHkgZm9yIGFwcHMgdG8gdGFrZSBzY3JlZW5zaG90cyB3aXRob3V0IGJvcmRlcnMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA3NgktCSMgRGlzYWJsZSB0aGUgYWJpbGl0eSBmb3IgZGVza3RvcCBhcHBzIHRvIHRha2Ugc2NyZWVuc2hvdHMgd2l0aG91dCBtYXJnaW5zIChDYXRlZ29yeTogQXBwIFByaXZhY3kpClAwNzcJLQkjIERpc2FibGUgYXBwIGFjY2VzcyB0byBtdXNpYyBsaWJyYXJpZXMgKENhdGVnb3J5OiBBcHAgUHJpdmFjeSkKUDA3OAktCSMgRGlzYWJsZSBhcHAgYWNjZXNzIHRvIG11c2ljIGxpYnJhcmllcyAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDc5CS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gZG93bmxvYWRzIGZvbGRlciAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDgwCS0JIyBEaXNhYmxlIGFwcCBhY2Nlc3MgdG8gZG93bmxvYWRzIGZvbGRlciAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpQMDI0CSsJIyBQcm9oaWJpdCBhcHBzIGZyb20gcnVubmluZyBpbiB0aGUgYmFja2dyb3VuZCAoQ2F0ZWdvcnk6IEFwcCBQcml2YWN5KQpTMDAxCSsJIyBEaXNhYmxlIHBhc3N3b3JkIHJldmVhbCBidXR0b24gKENhdGVnb3J5OiBTZWN1cml0eSkKUzAwMgkrCSMgRGlzYWJsZSB1c2VyIHN0ZXBzIHJlY29yZGVyIChDYXRlZ29yeTogU2VjdXJpdHkpClMwMDMJKwkjIERpc2FibGUgdGVsZW1ldHJ5IChDYXRlZ29yeTogU2VjdXJpdHkpClMwMDgJLQkjIERpc2FibGUgSW50ZXJuZXQgYWNjZXNzIG9mIFdpbmRvd3MgTWVkaWEgRGlnaXRhbCBSaWdodHMgTWFuYWdlbWVudCAoRFJNKSAoQ2F0ZWdvcnk6IFNlY3VyaXR5KQpFMDAxCSsJIyBEaXNhYmxlIHRyYWNraW5nIGluIHRoZSB3ZWIgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDAyCSsJIyBEaXNhYmxlIHBhZ2UgcHJlZGljdGlvbiAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBFZGdlIChsZWdhY3kgdmVyc2lvbikpCkUwMDMJKwkjIERpc2FibGUgc2VhcmNoIGFuZCB3ZWJzaXRlIHN1Z2dlc3Rpb25zIChDYXRlZ29yeTogTWljcm9zb2Z0IEVkZ2UgKGxlZ2FjeSB2ZXJzaW9uKSkKRTAwOAkrCSMgRGlzYWJsZSBDb3J0YW5hIGluIE1pY3Jvc29mdCBFZGdlIChDYXRlZ29yeTogTWljcm9zb2Z0IEVkZ2UgKGxlZ2FjeSB2ZXJzaW9uKSkKRTAwNwkrCSMgRGlzYWJsZSBhdXRvbWF0aWMgY29tcGxldGlvbiBvZiB3ZWIgYWRkcmVzc2VzIGluIGFkZHJlc3MgYmFyIChDYXRlZ29yeTogTWljcm9zb2Z0IEVkZ2UgKGxlZ2FjeSB2ZXJzaW9uKSkKRTAxMAkrCSMgRGlzYWJsZSBzaG93aW5nIHNlYXJjaCBoaXN0b3J5IChDYXRlZ29yeTogTWljcm9zb2Z0IEVkZ2UgKGxlZ2FjeSB2ZXJzaW9uKSkKRTAxMQkrCSMgRGlzYWJsZSB1c2VyIGZlZWRiYWNrIGluIHRvb2xiYXIgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDEyCSsJIyBEaXNhYmxlIHN0b3JpbmcgYW5kIGF1dG9jb21wbGV0aW5nIG9mIGNyZWRpdCBjYXJkIGRhdGEgb24gd2Vic2l0ZXMgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDA5CS0JIyBEaXNhYmxlIGZvcm0gc3VnZ2VzdGlvbnMgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDA0CS0JIyBEaXNhYmxlIHNpdGVzIHNhdmluZyBwcm90ZWN0ZWQgbWVkaWEgbGljZW5zZXMgb24gbXkgZGV2aWNlIChDYXRlZ29yeTogTWljcm9zb2Z0IEVkZ2UgKGxlZ2FjeSB2ZXJzaW9uKSkKRTAwNQktCSMgRG8gbm90IG9wdGltaXplIHdlYiBzZWFyY2ggcmVzdWx0cyBvbiB0aGUgdGFzayBiYXIgZm9yIHNjcmVlbiByZWFkZXIgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDEzCS0JIyBEaXNhYmxlIE1pY3Jvc29mdCBFZGdlIGxhdW5jaCBpbiB0aGUgYmFja2dyb3VuZCAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBFZGdlIChsZWdhY3kgdmVyc2lvbikpCkUwMTQJLQkjIERpc2FibGUgbG9hZGluZyB0aGUgc3RhcnQgYW5kIG5ldyB0YWIgcGFnZXMgaW4gdGhlIGJhY2tncm91bmQgKENhdGVnb3J5OiBNaWNyb3NvZnQgRWRnZSAobGVnYWN5IHZlcnNpb24pKQpFMDA2CS0JIyBEaXNhYmxlIFNtYXJ0U2NyZWVuIEZpbHRlciAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBFZGdlIChsZWdhY3kgdmVyc2lvbikpClkwMDEJKwkjIERpc2FibGUgc3luY2hyb25pemF0aW9uIG9mIGFsbCBzZXR0aW5ncyAoQ2F0ZWdvcnk6IFN5bmNocm9uaXphdGlvbiBvZiBXaW5kb3dzIFNldHRpbmdzKQpZMDAyCSsJIyBEaXNhYmxlIHN5bmNocm9uaXphdGlvbiBvZiBkZXNpZ24gc2V0dGluZ3MgKENhdGVnb3J5OiBTeW5jaHJvbml6YXRpb24gb2YgV2luZG93cyBTZXR0aW5ncykKWTAwMwkrCSMgRGlzYWJsZSBzeW5jaHJvbml6YXRpb24gb2YgYnJvd3NlciBzZXR0aW5ncyAoQ2F0ZWdvcnk6IFN5bmNocm9uaXphdGlvbiBvZiBXaW5kb3dzIFNldHRpbmdzKQpZMDA0CSsJIyBEaXNhYmxlIHN5bmNocm9uaXphdGlvbiBvZiBjcmVkZW50aWFscyAocGFzc3dvcmRzKSAoQ2F0ZWdvcnk6IFN5bmNocm9uaXphdGlvbiBvZiBXaW5kb3dzIFNldHRpbmdzKQpZMDA1CSsJIyBEaXNhYmxlIHN5bmNocm9uaXphdGlvbiBvZiBsYW5ndWFnZSBzZXR0aW5ncyAoQ2F0ZWdvcnk6IFN5bmNocm9uaXphdGlvbiBvZiBXaW5kb3dzIFNldHRpbmdzKQpZMDA2CSsJIyBEaXNhYmxlIHN5bmNocm9uaXphdGlvbiBvZiBhY2Nlc3NpYmlsaXR5IHNldHRpbmdzIChDYXRlZ29yeTogU3luY2hyb25pemF0aW9uIG9mIFdpbmRvd3MgU2V0dGluZ3MpClkwMDcJKwkjIERpc2FibGUgc3luY2hyb25pemF0aW9uIG9mIGFkdmFuY2VkIFdpbmRvd3Mgc2V0dGluZ3MgKENhdGVnb3J5OiBTeW5jaHJvbml6YXRpb24gb2YgV2luZG93cyBTZXR0aW5ncykKQzAxMgkrCSMgRGlzYWJsZSBhbmQgcmVzZXQgQ29ydGFuYSAoQ2F0ZWdvcnk6IENvcnRhbmEgKFBlcnNvbmFsIEFzc2lzdGFudCkpCkMwMDIJKwkjIERpc2FibGUgSW5wdXQgUGVyc29uYWxpemF0aW9uIChDYXRlZ29yeTogQ29ydGFuYSAoUGVyc29uYWwgQXNzaXN0YW50KSkKQzAxMwkrCSMgRGlzYWJsZSBvbmxpbmUgc3BlZWNoIHJlY29nbml0aW9uIChDYXRlZ29yeTogQ29ydGFuYSAoUGVyc29uYWwgQXNzaXN0YW50KSkKQzAwNwkrCSMgQ29ydGFuYSBhbmQgc2VhcmNoIGFyZSBkaXNhbGxvd2VkIHRvIHVzZSBsb2NhdGlvbiAoQ2F0ZWdvcnk6IENvcnRhbmEgKFBlcnNvbmFsIEFzc2lzdGFudCkpCkMwMDgJKwkjIERpc2FibGUgd2ViIHNlYXJjaCBmcm9tIFdpbmRvd3MgRGVza3RvcCBTZWFyY2ggKENhdGVnb3J5OiBDb3J0YW5hIChQZXJzb25hbCBBc3Npc3RhbnQpKQpDMDA5CSsJIyBEaXNhYmxlIGRpc3BsYXkgd2ViIHJlc3VsdHMgaW4gU2VhcmNoIChDYXRlZ29yeTogQ29ydGFuYSAoUGVyc29uYWwgQXNzaXN0YW50KSkKQzAxMAkrCSMgRGlzYWJsZSBkb3dubG9hZCBhbmQgdXBkYXRlcyBvZiBzcGVlY2ggcmVjb2duaXRpb24gYW5kIHNwZWVjaCBzeW50aGVzaXMgbW9kZWxzIChDYXRlZ29yeTogQ29ydGFuYSAoUGVyc29uYWwgQXNzaXN0YW50KSkKQzAxMQkrCSMgRGlzYWJsZSBjbG91ZCBzZWFyY2ggKENhdGVnb3J5OiBDb3J0YW5hIChQZXJzb25hbCBBc3Npc3RhbnQpKQpDMDE0CSsJIyBEaXNhYmxlIENvcnRhbmEgYWJvdmUgbG9jayBzY3JlZW4gKENhdGVnb3J5OiBDb3J0YW5hIChQZXJzb25hbCBBc3Npc3RhbnQpKQpDMDE1CSsJIyBEaXNhYmxlIHRoZSBzZWFyY2ggaGlnaGxpZ2h0cyBpbiB0aGUgdGFza2JhciAoQ2F0ZWdvcnk6IENvcnRhbmEgKFBlcnNvbmFsIEFzc2lzdGFudCkpCkMxMDEJKwkjIERpc2FibGUgdGhlIFdpbmRvd3MgQ29waWxvdCAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBDb3BpbG90IChpbiBXaW5kb3dzKSkKQzIwMQkrCSMgRGlzYWJsZSB0aGUgV2luZG93cyBDb3BpbG90IChDYXRlZ29yeTogTWljcm9zb2Z0IENvcGlsb3QgKGluIFdpbmRvd3MpKQpDMjA0CSsJIyBEaXNhYmxlIHRoZSBwcm92aXNpb24gb2YgcmVjYWxsIGZ1bmN0aW9uYWxpdHkgdG8gYWxsIHVzZXJzIChDYXRlZ29yeTogTWljcm9zb2Z0IENvcGlsb3QgKGluIFdpbmRvd3MpKQpDMjA1CSsJIyBEaXNhYmxlIHRoZSBJbWFnZSBDcmVhdG9yIGluIE1pY3Jvc29mdCBQYWludCAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBDb3BpbG90IChpbiBXaW5kb3dzKSkKQzEwMgkrCSMgRGlzYWJsZSB0aGUgQ29waWxvdCBidXR0b24gZnJvbSB0aGUgdGFza2JhciAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBDb3BpbG90IChpbiBXaW5kb3dzKSkKQzEwNAkrCSMgRGlzYWJsZSBCaW5nIENoYXQgZWxpZ2liaWxpdHkgaW4gV2luZG93cyBDb3BpbG90IChDYXRlZ29yeTogTWljcm9zb2Z0IENvcGlsb3QgKGluIFdpbmRvd3MpKQpDMTAzCSsJIyBEaXNhYmxlIFdpbmRvd3MgQ29waWxvdCsgUmVjYWxsIChDYXRlZ29yeTogTWljcm9zb2Z0IENvcGlsb3QgKGluIFdpbmRvd3MpKQpDMjAzCSsJIyBEaXNhYmxlIFdpbmRvd3MgQ29waWxvdCsgUmVjYWxsIChDYXRlZ29yeTogTWljcm9zb2Z0IENvcGlsb3QgKGluIFdpbmRvd3MpKQpDMjA2CS0JIyBEaXNhYmxlIENvY3JlYXRvciBpbiBNaWNyb3NvZnQgUGFpbnQgKENhdGVnb3J5OiBNaWNyb3NvZnQgQ29waWxvdCAoaW4gV2luZG93cykpCkMyMDcJLQkjIERpc2FibGUgQUktcG93ZXJlZCBpbWFnZSBmaWxsIGluIE1pY3Jvc29mdCBQYWludCAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBDb3BpbG90IChpbiBXaW5kb3dzKSkKTDAwMQkrCSMgRGlzYWJsZSBmdW5jdGlvbmFsaXR5IHRvIGxvY2F0ZSB0aGUgc3lzdGVtIChDYXRlZ29yeTogTG9jYXRpb24gU2VydmljZXMpCkwwMDMJKwkjIERpc2FibGUgc2NyaXB0aW5nIGZ1bmN0aW9uYWxpdHkgdG8gbG9jYXRlIHRoZSBzeXN0ZW0gKENhdGVnb3J5OiBMb2NhdGlvbiBTZXJ2aWNlcykKTDAwNAktCSMgRGlzYWJsZSBzZW5zb3JzIGZvciBsb2NhdGluZyB0aGUgc3lzdGVtIGFuZCBpdHMgb3JpZW50YXRpb24gKENhdGVnb3J5OiBMb2NhdGlvbiBTZXJ2aWNlcykKTDAwNQktCSMgRGlzYWJsZSBXaW5kb3dzIEdlb2xvY2F0aW9uIFNlcnZpY2UgKENhdGVnb3J5OiBMb2NhdGlvbiBTZXJ2aWNlcykKVTAwMQkrCSMgRGlzYWJsZSBhcHBsaWNhdGlvbiB0ZWxlbWV0cnkgKENhdGVnb3J5OiBVc2VyIEJlaGF2aW9yKQpVMDA0CSsJIyBEaXNhYmxlIGRpYWdub3N0aWMgZGF0YSBmcm9tIGN1c3RvbWl6aW5nIHVzZXIgZXhwZXJpZW5jZXMgKENhdGVnb3J5OiBVc2VyIEJlaGF2aW9yKQpVMDA1CSsJIyBEaXNhYmxlIGRpYWdub3N0aWMgZGF0YSBmcm9tIGN1c3RvbWl6aW5nIHVzZXIgZXhwZXJpZW5jZXMgKENhdGVnb3J5OiBVc2VyIEJlaGF2aW9yKQpVMDA2CSsJIyBEaXNhYmxlIGRpYWdub3N0aWMgbG9nIGNvbGxlY3Rpb24gKENhdGVnb3J5OiBVc2VyIEJlaGF2aW9yKQpVMDA3CSsJIyBEaXNhYmxlIGRvd25sb2FkaW5nIG9mIE9uZVNldHRpbmdzIGNvbmZpZ3VyYXRpb24gc2V0dGluZ3MgKENhdGVnb3J5OiBVc2VyIEJlaGF2aW9yKQpXMDAxCSsJIyBEaXNhYmxlIFdpbmRvd3MgVXBkYXRlIHZpYSBwZWVyLXRvLXBlZXIgKENhdGVnb3J5OiBXaW5kb3dzIFVwZGF0ZSkKVzAxMQkrCSMgRGlzYWJsZSB1cGRhdGVzIHRvIHRoZSBzcGVlY2ggcmVjb2duaXRpb24gYW5kIHNwZWVjaCBzeW50aGVzaXMgbW9kdWxlcy4gKENhdGVnb3J5OiBXaW5kb3dzIFVwZGF0ZSkKVzAwNAktCSMgQWN0aXZhdGUgZGVmZXJyaW5nIG9mIHVwZ3JhZGVzIChDYXRlZ29yeTogV2luZG93cyBVcGRhdGUpClcwMDUJLQkjIERpc2FibGUgYXV0b21hdGljIGRvd25sb2FkaW5nIG1hbnVmYWN0dXJlcnMnIGFwcHMgYW5kIGljb25zIGZvciBkZXZpY2VzIChDYXRlZ29yeTogV2luZG93cyBVcGRhdGUpClcwMTAJLQkjIERpc2FibGUgYXV0b21hdGljIGRyaXZlciB1cGRhdGVzIHRocm91Z2ggV2luZG93cyBVcGRhdGUgKENhdGVnb3J5OiBXaW5kb3dzIFVwZGF0ZSkKVzAwOQktCSMgRGlzYWJsZSBhdXRvbWF0aWMgYXBwIHVwZGF0ZXMgdGhyb3VnaCBXaW5kb3dzIFVwZGF0ZSAoQ2F0ZWdvcnk6IFdpbmRvd3MgVXBkYXRlKQpQMDE3CS0JIyBEaXNhYmxlIFdpbmRvd3MgZHluYW1pYyBjb25maWd1cmF0aW9uIGFuZCB1cGRhdGUgcm9sbG91dHMgKENhdGVnb3J5OiBXaW5kb3dzIFVwZGF0ZSkKVzAwNgktCSMgRGlzYWJsZSBhdXRvbWF0aWMgV2luZG93cyBVcGRhdGVzIChDYXRlZ29yeTogV2luZG93cyBVcGRhdGUpClcwMDgJLQkjIERpc2FibGUgV2luZG93cyBVcGRhdGVzIGZvciBvdGhlciBwcm9kdWN0cyAoZS5nLiBNaWNyb3NvZnQgT2ZmaWNlKSAoQ2F0ZWdvcnk6IFdpbmRvd3MgVXBkYXRlKQpNMDA2CSsJIyBEaXNhYmxlIG9jY2Fzc2lvbmFsbHkgc2hvd2luZyBhcHAgc3VnZ2VzdGlvbnMgaW4gU3RhcnQgbWVudSAoQ2F0ZWdvcnk6IFdpbmRvd3MgRXhwbG9yZXIpCk0wMTEJKwkjIERvIG5vdCBzaG93IHJlY2VudGx5IG9wZW5lZCBpdGVtcyBpbiBKdW1wIExpc3RzIG9uICJTdGFydCIgb3IgdGhlIHRhc2tiYXIgKENhdGVnb3J5OiBXaW5kb3dzIEV4cGxvcmVyKQpNMDEwCS0JIyBEaXNhYmxlIGFkcyBpbiBXaW5kb3dzIEV4cGxvcmVyL09uZURyaXZlIChDYXRlZ29yeTogV2luZG93cyBFeHBsb3JlcikKTzAwMwktCSMgRGlzYWJsZSBPbmVEcml2ZSBhY2Nlc3MgdG8gbmV0d29yayBiZWZvcmUgbG9naW4gKENhdGVnb3J5OiBXaW5kb3dzIEV4cGxvcmVyKQpPMDAxCS0JIyBEaXNhYmxlIE1pY3Jvc29mdCBPbmVEcml2ZSAoQ2F0ZWdvcnk6IFdpbmRvd3MgRXhwbG9yZXIpClMwMTIJLQkjIERpc2FibGUgTWljcm9zb2Z0IFNweU5ldCBtZW1iZXJzaGlwIChDYXRlZ29yeTogTWljcm9zb2Z0IERlZmVuZGVyIGFuZCBNaWNyb3NvZnQgU3B5TmV0KQpTMDEzCS0JIyBEaXNhYmxlIHN1Ym1pdHRpbmcgZGF0YSBzYW1wbGVzIHRvIE1pY3Jvc29mdCAoQ2F0ZWdvcnk6IE1pY3Jvc29mdCBEZWZlbmRlciBhbmQgTWljcm9zb2Z0IFNweU5ldCkKUzAxNAktCSMgRGlzYWJsZSByZXBvcnRpbmcgb2YgbWFsd2FyZSBpbmZlY3Rpb24gaW5mb3JtYXRpb24gKENhdGVnb3J5OiBNaWNyb3NvZnQgRGVmZW5kZXIgYW5kIE1pY3Jvc29mdCBTcHlOZXQpCkswMDEJKwkjIERpc2FibGUgV2luZG93cyBTcG90bGlnaHQgKENhdGVnb3J5OiBMb2NrIFNjcmVlbikKSzAwMgkrCSMgRGlzYWJsZSBmdW4gZmFjdHMsIHRpcHMsIHRyaWNrcywgYW5kIG1vcmUgb24geW91ciBsb2NrIHNjcmVlbiAoQ2F0ZWdvcnk6IExvY2sgU2NyZWVuKQpLMDA1CSsJIyBEaXNhYmxlIG5vdGlmaWNhdGlvbnMgb24gbG9jayBzY3JlZW4gKENhdGVnb3J5OiBMb2NrIFNjcmVlbikKRDAwMQkrCSMgRGlzYWJsZSBhY2Nlc3MgdG8gbW9iaWxlIGRldmljZXMgKENhdGVnb3J5OiBNb2JpbGUgRGV2aWNlcykKRDAwMgkrCSMgRGlzYWJsZSBQaG9uZSBMaW5rIGFwcCAoQ2F0ZWdvcnk6IE1vYmlsZSBEZXZpY2VzKQpEMDAzCSsJIyBEaXNhYmxlIHNob3dpbmcgc3VnZ2VzdGlvbnMgZm9yIHVzaW5nIG1vYmlsZSBkZXZpY2VzIHdpdGggV2luZG93cyAoQ2F0ZWdvcnk6IE1vYmlsZSBEZXZpY2VzKQpEMTA0CSsJIyBEaXNhYmxlIGNvbm5lY3RpbmcgdGhlIFBDIHRvIG1vYmlsZSBkZXZpY2VzIChDYXRlZ29yeTogTW9iaWxlIERldmljZXMpCk0wMjUJKwkjIERpc2FibGUgc2VhcmNoIHdpdGggQUkgaW4gc2VhcmNoIGJveCAoQ2F0ZWdvcnk6IFNlYXJjaCkKTTAwMwktCSMgRGlzYWJsZSBleHRlbnNpb24gb2YgV2luZG93cyBzZWFyY2ggd2l0aCBCaW5nIChDYXRlZ29yeTogU2VhcmNoKQpNMDE1CS0JIyBEaXNhYmxlIFBlb3BsZSBpY29uIGluIHRoZSB0YXNrYmFyIChDYXRlZ29yeTogVGFza2JhcikKTTAxNgkrCSMgRGlzYWJsZSBzZWFyY2ggYm94IGluIHRhc2sgYmFyIChDYXRlZ29yeTogVGFza2JhcikKTTAxNwktCSMgRGlzYWJsZSAiTWVldCBub3ciIGluIHRoZSB0YXNrIGJhciAoQ2F0ZWdvcnk6IFRhc2tiYXIpCk0wMTgJLQkjIERpc2FibGUgIk1lZXQgbm93IiBpbiB0aGUgdGFzayBiYXIgKENhdGVnb3J5OiBUYXNrYmFyKQpNMDE5CSsJIyBEaXNhYmxlIG5ld3MgYW5kIGludGVyZXN0cyBpbiB0aGUgdGFzayBiYXIgKENhdGVnb3J5OiBUYXNrYmFyKQpNMDIyCSsJIyBEaXNhYmxlIGZlZWRiYWNrIHJlbWluZGVycyAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMpCk0wMDEJKwkjIERpc2FibGUgZmVlZGJhY2sgcmVtaW5kZXJzIChDYXRlZ29yeTogTWlzY2VsbGFuZW91cykKTTAwNAkrCSMgRGlzYWJsZSBhdXRvbWF0aWMgaW5zdGFsbGF0aW9uIG9mIHJlY29tbWVuZGVkIFdpbmRvd3MgU3RvcmUgQXBwcyAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMpCk0wMDUJKwkjIERpc2FibGUgdGlwcywgdHJpY2tzLCBhbmQgc3VnZ2VzdGlvbnMgd2hpbGUgdXNpbmcgV2luZG93cyAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMpCk0wMjQJKwkjIERpc2FibGUgV2luZG93cyBNZWRpYSBQbGF5ZXIgRGlhZ25vc3RpY3MgKENhdGVnb3J5OiBNaXNjZWxsYW5lb3VzKQpNMDEyCS0JIyBEaXNhYmxlIEtleSBNYW5hZ2VtZW50IFNlcnZpY2UgT25saW5lIEFjdGl2YXRpb24gKENhdGVnb3J5OiBNaXNjZWxsYW5lb3VzKQpNMDEzCS0JIyBEaXNhYmxlIGF1dG9tYXRpYyBkb3dubG9hZCBhbmQgdXBkYXRlIG9mIG1hcCBkYXRhIChDYXRlZ29yeTogTWlzY2VsbGFuZW91cykKTTAxNAktCSMgRGlzYWJsZSB1bnNvbGljaXRlZCBuZXR3b3JrIHRyYWZmaWMgb24gdGhlIG9mZmxpbmUgbWFwcyBzZXR0aW5ncyBwYWdlIChDYXRlZ29yeTogTWlzY2VsbGFuZW91cykKTTAyNgkrCSMgRGlzYWJsZSByZW1vdGUgYXNzaXN0YW5jZSBjb25uZWN0aW9ucyB0byB0aGlzIGNvbXB1dGVyIChDYXRlZ29yeTogTWlzY2VsbGFuZW91cykKTTAyNwkrCSMgRGlzYWJsZSByZW1vdGUgY29ubmVjdGlvbnMgdG8gdGhpcyBjb21wdXRlciAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMpCk0wMjgJKwkjIERpc2FibGUgdGhlIGRlc2t0b3AgaWNvbiBmb3IgaW5mb3JtYXRpb24gb24gIldpbmRvd3MgU3BvdGxpZ2h0IiAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMpCk4wMDEJLQkjIERpc2FibGUgTmV0d29yayBDb25uZWN0aXZpdHkgU3RhdHVzIEluZGljYXRvciAoQ2F0ZWdvcnk6IE1pc2NlbGxhbmVvdXMp";
const WINAERO_INI_B64 = "CltGb3JtYXRdClByb2R1Y3ROYW1lPVdpbmFlcm8gVHdlYWtlcgpQcm9kdWN0VmVyc2lvbj0xLjY1LjAuMApGb3JtYXRWZXJzaW9uPTEuMQpbVXNlcl0KcGFnZUJhY2tncm91bmRBcHBzPTEKcGFnZVdpbjExQ2xhc3NpY0NvbnRleHRNZW51cz0xCnBhZ2VTdGFydFJlY29tbWVuZGVkPTEKcGFnZUFkc1Vud2FudGVkQXBwcz0xCnBhZ2VDaHJFZGdlRGlzYWJsZURlc2t0b3BTaG9ydGN1dD0xCnBhZ2VDaHJFZGdlRGlzYWJsZVVwZGF0ZXM9MQpbcGFnZUFkc1Vud2FudGVkQXBwc10KVW53YW50ZWRBcHBzRGlzYWJsZWQ9MQpGaWxlRXhwbG9yZXJBZHNEaXNhYmxlZD0wCkxvY2tTY3JlZW5BZHNEaXNhYmxlZD0xClN0YXJ0U3VnZ2VzdGlvbnNEaXNhYmxlZD0xClRpcHNBYm91dFdpbmRvd3NEaXNhYmxlZD0xCldlbGNvbWVQYWdlRGlzYWJsZWQ9MQpTZXR0aW5nc0Fkc0Rpc2FibGVkPTEKVGltZWxpbmVTdWdnZXN0aW9uc0Rpc2FibGVkPTA=";

export default function Debloat() {
  const { toast } = useToast();

  const [shutup10Status, setShutup10Status] = useState<LaunchStatus>("idle");
  const [titusStatus, setTitusStatus] = useState<LaunchStatus>("idle");
  const [winaerotStatus, setWinaerotStatus] = useState<LaunchStatus>("idle");
  const [cttImportStatus, setCttImportStatus] = useState<LaunchStatus>("idle");
  const [shutupImportStatus, setShutupImportStatus] = useState<LaunchStatus>("idle");
  const [winaeroImportStatus, setWinaeroImportStatus] = useState<LaunchStatus>("idle");

  const launchShutUp10 = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "O&O ShutUp10++ can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setShutup10Status("downloading");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      ``,
      `# Check registry App Paths`,
      `$regPaths = @(`,
      `  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OOSU10.exe',`,
      `  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OOSU10.exe'`,
      `)`,
      `foreach ($rp in $regPaths) {`,
      `  if (Test-Path $rp) {`,
      `    $val = (Get-ItemProperty $rp -EA SilentlyContinue).'(default)'`,
      `    if ($val -and (Test-Path $val)) { $exePath = $val; break }`,
      `  }`,
      `}`,
      ``,
      `# Check common install directories`,
      `if (-not $exePath) {`,
      `  $candidates = @(`,
      `    "$env:ProgramFiles\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "\${env:ProgramFiles(x86)}\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:LOCALAPPDATA\\Programs\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:LOCALAPPDATA\\OO Software\\ShutUp10\\OOSU10.exe",`,
      `    "$env:ProgramFiles\\OOSU10\\OOSU10.exe",`,
      `    "\${env:ProgramFiles(x86)}\\OOSU10\\OOSU10.exe"`,
      `  )`,
      `  foreach ($c in $candidates) {`,
      `    if (Test-Path $c) { $exePath = $c; break }`,
      `  }`,
      `}`,
      ``,
      `# Scan uninstall registry for OO ShutUp10`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @(`,
      `    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',`,
      `    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'`,
      `  )`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object {`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*ShutUp10*' -or`,
      `        (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*OOSU*'`,
      `      } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc "OOSU10.exe"; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `# Check persistent cache`,
      `$cacheDir = Join-Path $env:LOCALAPPDATA "JGoode-AIO\\Tool"`,
      `$cacheDest = Join-Path $cacheDir "OOSU10.exe"`,
      `if (-not $exePath) {`,
      `  if ((Test-Path $cacheDest) -and (Get-Item $cacheDest -EA SilentlyContinue).Length -ge 1048576) { $exePath = $cacheDest }`,
      `}`,
      ``,
      `# Also check legacy Temp cache location`,
      `if (-not $exePath) {`,
      `  $t = Join-Path $env:TEMP "OOSU10.exe"`,
      `  if ((Test-Path $t) -and (Get-Item $t -EA SilentlyContinue).Length -ge 1048576) {`,
      `    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `    Copy-Item $t $cacheDest -Force -EA SilentlyContinue`,
      `    $exePath = $cacheDest`,
      `  }`,
      `}`,
      ``,
      `# Download and cache`,
      `if (-not $exePath) {`,
      `  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`,
      `  [Net.ServicePointManager]::DefaultConnectionLimit = 10`,
      `  if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }`,
      `  $tmpDest = Join-Path $env:TEMP "OOSU10_dl.exe"`,
      `  if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `  $dlUrl = "https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe"`,
      `  $dlOk = $false`,
      `  try {`,
      `    $bits = Get-Command Start-BitsTransfer -EA Stop`,
      `    & $bits.Name -Source $dlUrl -Destination $tmpDest -Priority Foreground -TransferType Download -EA Stop`,
      `    if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `  } catch {}`,
      `  if (-not $dlOk) {`,
      `    try {`,
      `      if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `      $wc = New-Object System.Net.WebClient`,
      `      $wc.Proxy = [System.Net.GlobalProxySelection]::Empty`,
      `      $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `      $wc.DownloadFile($dlUrl, $tmpDest)`,
      `      if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `    } catch {}`,
      `  }`,
      `  if (-not $dlOk) {`,
      `    try {`,
      `      if (Test-Path $tmpDest) { Remove-Item $tmpDest -Force -EA SilentlyContinue }`,
      `      Invoke-WebRequest -Uri $dlUrl -OutFile $tmpDest -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -UseBasicParsing -TimeoutSec 90 -EA Stop`,
      `      if ((Test-Path $tmpDest) -and (Get-Item $tmpDest -EA SilentlyContinue).Length -ge 1048576) { $dlOk = $true }`,
      `    } catch {}`,
      `  }`,
      `  if (-not $dlOk) { Write-Error "Download failed — check internet connection"; exit 1 }`,
      `  Move-Item $tmpDest $cacheDest -Force`,
      `  $exePath = $cacheDest`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");

    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setShutup10Status("done");
        toast({ title: "O&O ShutUp10++ launched", description: "The app window should appear momentarily." });
      } else {
        setShutup10Status("error");
        toast({ title: "Launch failed", description: "Could not download or launch ShutUp10++. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setShutup10Status("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setShutup10Status("idle"), 4000);
  };

  const launchTitusTool = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Chris Titus Tech WinUtil can only run from the installed desktop app.", variant: "destructive" });
      return;
    }
    setTitusStatus("running");
    const script = [
      `# Chris Titus Tech WinUtil — encode the command to avoid all quoting issues`,
      `$cmd = 'irm https://christitus.com/win | iex'`,
      `$bytes = [System.Text.Encoding]::Unicode.GetBytes($cmd)`,
      `$encoded = [System.Convert]::ToBase64String($bytes)`,
      `Start-Process powershell.exe -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded -Verb RunAs -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setTitusStatus("done");
        toast({ title: "WinUtil launched", description: "The Chris Titus Tech window should appear. Accept the UAC prompt if asked." });
      } else {
        setTitusStatus("error");
        toast({ title: "Launch failed", description: "Could not launch WinUtil. Check your internet connection.", variant: "destructive" });
      }
    } catch {
      setTitusStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setTitusStatus("idle"), 5000);
  };

  const launchWinaerot = async () => {
    if (!window.electronAPI?.runScript) {
      toast({ title: "Desktop app required", description: "Winaero Tweaker can only launch from the installed desktop app.", variant: "destructive" });
      return;
    }
    setWinaerotStatus("launching");
    const script = [
      `$ErrorActionPreference = 'SilentlyContinue'`,
      `$exePath = $null`,
      `$installCandidates = @(`,
      `  "$env:ProgramFiles\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "\${env:ProgramFiles(x86)}\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Programs\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:LOCALAPPDATA\\Winaero Tweaker\\WinaeroTweaker.exe",`,
      `  "$env:ProgramData\\Winaero Tweaker\\WinaeroTweaker.exe"`,
      `)`,
      ``,
      `# 1. Check registry App Paths`,
      `foreach ($rp in @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WinaeroTweaker.exe')) {`,
      `  if (Test-Path $rp) {`,
      `    $val = (Get-ItemProperty $rp -EA SilentlyContinue).'(default)'`,
      `    if ($val -and (Test-Path $val)) { $exePath = $val; break }`,
      `  }`,
      `}`,
      ``,
      `# 2. Check common install directories`,
      `if (-not $exePath) {`,
      `  foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `}`,
      ``,
      `# 3. Check uninstall registry`,
      `if (-not $exePath) {`,
      `  $uninstKeys = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall')`,
      `  foreach ($uk in $uninstKeys) {`,
      `    if (Test-Path $uk) {`,
      `      $match = Get-ChildItem $uk -EA SilentlyContinue | Where-Object { (Get-ItemProperty $_.PSPath -EA SilentlyContinue).DisplayName -like '*Winaero*' } | Select-Object -First 1`,
      `      if ($match) {`,
      `        $icon = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).DisplayIcon`,
      `        if ($icon) { $icon = $icon -replace ',\\d+$',''; if (Test-Path $icon) { $exePath = $icon; break } }`,
      `        $loc = (Get-ItemProperty $match.PSPath -EA SilentlyContinue).InstallLocation`,
      `        if ($loc) { $t = Join-Path $loc 'WinaeroTweaker.exe'; if (Test-Path $t) { $exePath = $t; break } }`,
      `      }`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `# 4. Silent install from bundled setup`,
      `if (-not $exePath -and $env:ELECTRON_RESOURCES_PATH) {`,
      `  $setup = Join-Path $env:ELECTRON_RESOURCES_PATH 'executables\\WinaeroTweakerSetup.exe'`,
      `  if (Test-Path $setup) {`,
      `    Start-Process -FilePath $setup -ArgumentList '/SP-', '/VERYSILENT' -Wait`,
      `    Start-Sleep -Seconds 2`,
      `    foreach ($c in $installCandidates) { if (Test-Path $c) { $exePath = $c; break } }`,
      `  }`,
      `}`,
      ``,
      `# 5. Download portable copy as last resort`,
      `if (-not $exePath) {`,
      `  $ErrorActionPreference = 'Stop'`,
      `  $destDir = Join-Path $env:TEMP "WinaeroTweaker"`,
      `  $zip = Join-Path $env:TEMP "WinaeroTweaker.zip"`,
      `  try {`,
      `    $wc = New-Object System.Net.WebClient`,
      `    $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")`,
      `    $wc.DownloadFile("https://winaerotweaker.com/download/winaerotweaker.zip", $zip)`,
      `    if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }`,
      `    Expand-Archive -Path $zip -DestinationPath $destDir -Force`,
      `    $found = Get-ChildItem $destDir -Filter "WinaeroTweaker.exe" -Recurse -EA SilentlyContinue | Select-Object -First 1`,
      `    if ($found) { $exePath = $found.FullName } else { Write-Error "WinaeroTweaker.exe not found after extraction"; exit 1 }`,
      `  } catch { Write-Error "Download failed: $_"; exit 1 }`,
      `}`,
      ``,
      `Start-Process -FilePath $exePath -WindowStyle Normal`,
    ].join("\r\n");
    try {
      const result = await window.electronAPI.runScript(script);
      if (result.success) {
        setWinaerotStatus("done");
        toast({ title: "Winaero Tweaker launched", description: "The app window should appear momentarily." });
      } else {
        setWinaerotStatus("error");
        toast({ title: "Launch failed", description: "Could not find or launch Winaero Tweaker.", variant: "destructive" });
      }
    } catch {
      setWinaerotStatus("error");
      toast({ title: "Launch failed", description: "Script execution error.", variant: "destructive" });
    }
    setTimeout(() => setWinaerotStatus("idle"), 4000);
  };


  // ── Profile download helpers ────────────────────────────────────────────
  const downloadProfile = (b64: string, filename: string) => {
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importCttProfile = () => {
    setCttImportStatus("done");
    downloadProfile(CTT_PRESET_B64, "JGoode-CTT-preset.json");
    toast({ title: "CTT Preset downloaded", description: "In WinUtil: click the gear icon → Load Preset and select JGoode-CTT-preset.json." });
    setTimeout(() => setCttImportStatus("idle"), 4000);
  };

  const importShutup10Profile = () => {
    setShutupImportStatus("done");
    downloadProfile(SHUTUP10_CFG_B64, "JGoode-ShutUp10-profile.cfg");
    toast({ title: "ShutUp10++ profile downloaded", description: "In OOSU10: File → Import Settings, then select JGoode-ShutUp10-profile.cfg." });
    setTimeout(() => setShutupImportStatus("idle"), 4000);
  };

  const importWinaeroProfile = () => {
    setWinaeroImportStatus("done");
    downloadProfile(WINAERO_INI_B64, "JGoode-Winaero.ini");
    toast({ title: "Winaero config downloaded", description: "In Winaero Tweaker: File → Import Settings, then select JGoode-Winaero.ini." });
    setTimeout(() => setWinaeroImportStatus("idle"), 4000);
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            PC <span className="text-primary">Debloat</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Remove bloatware, harden privacy, and reclaim control of Windows
            <span className="ml-2 text-muted-foreground/40">· 3 professional tools</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/15 bg-primary/6 shrink-0">
          <PackageX className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest font-mono">3 Tools</span>
        </div>
      </div>

      {/* ── What is debloating? banner ───────────────────────────────────────── */}
      <div
        className="relative rounded-xl border border-border/50 bg-card overflow-hidden px-5 py-4"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top left, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.22)",
            }}
          >
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[12px] font-black text-foreground tracking-tight mb-1">What is Debloating?</h2>
            <p className="text-[10.5px] text-muted-foreground/70 leading-relaxed">
              Windows ships with dozens of pre-installed apps, background telemetry services, and privacy-invasive data collection that most users never asked for.
              Debloating removes or disables this overhead — recovering RAM, CPU, and disk I/O — and puts you back in control of what runs on your machine.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tool cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Chris Titus Tech WinUtil ─────────────────────────────────────── */}
        <DebloatCard
          icon={Zap}
          title="Chris Titus Tech WinUtil"
          tag="Open Source"
          description="All-in-one Windows tweaks, debloat & app installer"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            The most popular Windows utility on GitHub. Combines debloat presets, a curated app installer (winget), Windows fixes, and performance tweaks into one clean GUI — no command line required.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["Debloat Presets", "App Installer", "Privacy Fixes", "Performance"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="warn">
              Requires internet. Launches an elevated PowerShell window. Review all changes before applying — especially the debloat presets.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchTitusTool}
              disabled={titusStatus === "running"}
              status={titusStatus}
              label="Launch WinUtil"
              icon={Zap}
              testId="button-launch-christitus"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

        {/* ── O&O ShutUp10++ ───────────────────────────────────────────────── */}
        <DebloatCard
          icon={Shield}
          title="O&O ShutUp10++"
          tag="Free"
          description="Advanced Windows privacy & telemetry control"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            The gold standard for Windows privacy hardening. Over 200 individual toggles covering telemetry, diagnostic data, Microsoft account tracking, app permissions, Cortana, and advertising identifiers — all with per-setting explanations.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["200+ Settings", "Telemetry", "App Permissions", "Advertising"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="warn">
              First launch downloads ~77 MB from O&O Software (one-time only). Cached permanently in AppData — never re-downloaded.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchShutUp10}
              disabled={shutup10Status === "downloading"}
              status={shutup10Status}
              label="Launch ShutUp10++"
              icon={Download}
              testId="button-launch-shutup10"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

        {/* ── Winaero Tweaker ──────────────────────────────────────────────── */}
        <DebloatCard
          icon={Sparkles}
          title="Winaero Tweaker"
          tag="Bundled"
          description="Deep Windows UI & behavior customization"
        >
          <p className="text-[10.5px] text-muted-foreground/75 leading-relaxed flex-1">
            Unlocks hundreds of hidden Windows settings unavailable through normal menus. Customize the right-click context menu, disable lock screen ads, tweak taskbar behavior, adjust the boot screen, and much more — all with full undo support.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {["Context Menus", "UI Customization", "Boot Screen", "Full Undo"].map((badge) => (
                <span
                  key={badge}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "hsl(var(--primary) / 0.75)",
                    background: "hsl(var(--primary) / 0.07)",
                    borderColor: "hsl(var(--primary) / 0.18)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
            <InfoBox type="tip">
              Bundled with the app — installs silently on first launch. No download needed. Every subsequent launch is instant.
            </InfoBox>
          </div>
          <div className="pt-1">
            <LaunchBtn
              onClick={launchWinaerot}
              disabled={winaerotStatus === "launching"}
              status={winaerotStatus}
              label="Launch Winaero Tweaker"
              icon={Sparkles}
              testId="button-launch-winaerot"
            />
            {!window.electronAPI && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Requires the desktop .exe app</p>
            )}
          </div>
        </DebloatCard>

      </div>


      {/* ── Import My Presets ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileDown className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-black text-foreground tracking-tight">Download JGoode's Presets</span>
          <div className="flex-1 h-[1px] bg-border/25 rounded-full" />
        </div>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed -mt-0.5">
          Download a pre-configured profile for each tool, then import it manually using that tool's built-in import option.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <LaunchBtn
            onClick={importCttProfile}
            disabled={cttImportStatus === "done"}
            status={cttImportStatus}
            label="Download CTT Preset"
            icon={FileDown}
            testId="button-download-ctt-preset"
          />
          <LaunchBtn
            onClick={importShutup10Profile}
            disabled={shutupImportStatus === "done"}
            status={shutupImportStatus}
            label="Download ShutUp10++ Profile"
            icon={FileDown}
            testId="button-download-shutup10-profile"
          />
          <LaunchBtn
            onClick={importWinaeroProfile}
            disabled={winaeroImportStatus === "done"}
            status={winaeroImportStatus}
            label="Download Winaero Config"
            icon={FileDown}
            testId="button-download-winaero-config"
          />
        </div>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border/30 bg-secondary/15">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
          These are third-party tools maintained by their respective developers. JGoode's A.I.O PC Tool launchers them on your behalf but is not responsible for their behavior. Always review changes before applying, and create a restore point first if in doubt.
        </p>
      </div>

    </div>
  );
}
