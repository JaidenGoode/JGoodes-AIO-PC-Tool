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
          "card-premium h-full flex flex-col p-4 rounded-xl border transition-all duration-200 group cursor-default",
          accent
            ? "bg-primary/6 border-primary/20 hover:border-primary/40 glow-primary-sm"
            : "bg-card border-border hover:border-primary/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Icon + label row */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            accent ? "bg-primary/15" : "bg-secondary/60 group-hover:bg-primary/10"
          )}>
            <div className={cn(
              "w-4 h-4 transition-colors",
              accent ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"
            )}>
              {icon}
            </div>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.14em]">
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
              className="text-[13px] font-bold text-foreground leading-snug truncate"
              title={typeof primaryValue === "string" ? primaryValue : undefined}
            >
              {primaryValue}
            </div>
            {secondaryValue && (
              <div
                className="text-[11px] text-muted-foreground/55 mt-0.5 truncate"
                title={typeof secondaryValue === "string" ? secondaryValue : undefined}
              >
                {secondaryValue}
              </div>
            )}
            {extra && (
              <div className="mt-3 pt-3 border-t border-border/50">{extra}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
