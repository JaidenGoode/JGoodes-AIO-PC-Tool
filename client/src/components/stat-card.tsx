import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  primaryValue: string | ReactNode;
  secondaryValue?: string | ReactNode;
  extra?: ReactNode;
  delay?: number;
  isLoading?: boolean;
  accent?: boolean;
}

export function StatCard({
  icon,
  title,
  primaryValue,
  secondaryValue,
  extra,
  delay = 0,
  isLoading = false,
  accent = false,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: "easeOut" }}
      className="h-full"
    >
      <div
        className={cn(
          "h-full flex flex-col p-4 rounded-xl border transition-all duration-200 group cursor-default relative overflow-hidden",
          accent
            ? "bg-primary/6 border-primary/25"
            : "bg-card border-border/70 hover:border-primary/30"
        )}
        style={accent ? {
          boxShadow: "0 0 20px hsl(var(--primary) / 0.1), 0 2px 12px rgba(0,0,0,0.3)"
        } : {
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)"
        }}
        onMouseEnter={(e) => {
          if (!accent) (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px hsl(var(--primary) / 0.08), 0 4px 16px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          if (!accent) (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "p-1.5 rounded-lg border transition-all duration-200",
            accent
              ? "bg-primary/15 border-primary/20"
              : "bg-secondary/50 border-border/30 group-hover:bg-primary/10 group-hover:border-primary/20"
          )}>
            <div className={cn(
              "w-4 h-4 transition-colors",
              accent ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary"
            )}>
              {icon}
            </div>
          </div>
          <span className="text-[9.5px] font-black text-muted-foreground/40 uppercase tracking-[0.18em] group-hover:text-muted-foreground/60 transition-colors">
            {title}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4 bg-secondary/60" />
            <Skeleton className="h-3 w-1/2 bg-secondary/40" />
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div
              className="text-[13px] font-bold text-foreground leading-snug truncate group-hover:text-white transition-colors"
              title={typeof primaryValue === "string" ? primaryValue : undefined}
            >
              {primaryValue}
            </div>
            {secondaryValue && (
              <div
                className="text-[11px] text-muted-foreground/50 mt-0.5 truncate group-hover:text-muted-foreground/65 transition-colors"
                title={typeof secondaryValue === "string" ? secondaryValue : undefined}
              >
                {secondaryValue}
              </div>
            )}
            {extra && (
              <div className="mt-3 pt-3 border-t border-border/40">{extra}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
