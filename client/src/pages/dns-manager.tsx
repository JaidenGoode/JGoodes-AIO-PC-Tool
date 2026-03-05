import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getDns, setDns } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle2, Loader2, Shield, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const DNS_OPTIONS = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Fastest public DNS, privacy-focused",
    primary: "1.1.1.1",
    secondary: "1.0.0.1",
    icon: Zap,
    badge: "Fastest",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  {
    id: "google",
    name: "Google",
    description: "Reliable with global infrastructure",
    primary: "8.8.8.8",
    secondary: "8.8.4.4",
    icon: Globe,
    badge: "Popular",
    badgeColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  {
    id: "opendns",
    name: "OpenDNS",
    description: "Content filtering & phishing protection",
    primary: "208.67.222.222",
    secondary: "208.67.220.220",
    icon: Shield,
    badge: "Filtered",
    badgeColor: "text-green-400 bg-green-400/10 border-green-400/20",
  },
  {
    id: "quad9",
    name: "Quad9",
    description: "Security-focused, blocks malicious domains",
    primary: "9.9.9.9",
    secondary: "149.112.112.112",
    icon: Shield,
    badge: "Secure",
    badgeColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  {
    id: "nextdns",
    name: "NextDNS",
    description: "Customizable filtering and analytics",
    primary: "45.90.28.0",
    secondary: "45.90.30.0",
    icon: Eye,
    badge: "Custom",
    badgeColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  },
  {
    id: "default",
    name: "Default (ISP)",
    description: "Use your internet provider's DNS",
    primary: "Auto",
    secondary: "Auto",
    icon: Globe,
    badge: "Default",
    badgeColor: "text-muted-foreground bg-secondary border-border",
  },
];

export default function DNSManager() {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const { data: currentDns } = useQuery({
    queryKey: ["/api/dns/current"],
    queryFn: getDns as () => Promise<{ provider: string }>,
  });

  const mutation = useMutation({
    mutationFn: (provider: string) => setDns(provider) as Promise<{ provider: string; primary: string; secondary: string }>,
    onSuccess: (data) => {
      toast({
        title: "DNS Updated",
        description: `Switched to ${data.provider}. Run as Administrator to apply system-wide.`,
      });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Error", description: e.message });
    },
  });

  const activeDns = (currentDns as any)?.provider || null;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            DNS <span className="text-primary">Manager</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a DNS provider and click Apply — requires Administrator
          </p>
        </div>
        {activeDns && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-xs text-primary font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active: {activeDns}
          </div>
        )}
      </div>

      {/* DNS Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {DNS_OPTIONS.map((option, i) => {
          const Icon = option.icon;
          const isSelected = selectedProvider === option.id;
          const isActive = activeDns === option.id;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                data-testid={`card-dns-${option.id}`}
                onClick={() => setSelectedProvider(isSelected ? null : option.id)}
                className={cn(
                  "w-full h-full text-left p-4 rounded-xl border transition-all duration-150 space-y-3",
                  isSelected
                    ? "bg-primary/8 border-primary/35"
                    : isActive
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-card border-border hover:border-primary/25"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      isSelected ? "bg-primary/15" : "bg-secondary"
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <span className={cn(
                      "font-bold text-[13px]",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {option.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", option.badgeColor)}>
                      {option.badge}
                    </span>
                    {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                    {isSelected && !isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">{option.description}</p>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 mb-0.5">Primary</p>
                    <p className="font-mono text-[11px] font-semibold text-primary">{option.primary}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 mb-0.5">Secondary</p>
                    <p className="font-mono text-[11px] font-semibold text-primary">{option.secondary}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Apply */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
        <Button
          data-testid="button-apply-dns"
          onClick={() => selectedProvider && mutation.mutate(selectedProvider)}
          disabled={mutation.isPending || !selectedProvider}
          className="bg-primary text-white font-semibold h-8 text-sm min-w-[120px]"
        >
          {mutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Apply DNS
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {selectedProvider
            ? `Will apply ${DNS_OPTIONS.find(o => o.id === selectedProvider)?.name} to all network adapters`
            : "Select a DNS provider above to enable Apply"}
        </p>
      </div>
    </div>
  );
}
