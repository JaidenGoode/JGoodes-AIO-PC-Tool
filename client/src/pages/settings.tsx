import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import { getSettings, saveSettings, checkUpdate, openUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Github, Palette, Bell, CheckCircle2, XCircle, Monitor, Sun, Moon } from "lucide-react";
import { useTheme, THEME_COLORS } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type Settings = { theme: string; trayIcon: boolean; analytics: boolean };
type UpdateInfo = {
  currentVersion: string; latestVersion: string; isUpToDate: boolean;
  releaseUrl: string; releaseName: string; publishedAt: string | null;
};

function Section({ title, icon: Icon, children, delay = 0 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { mode, setMode, accentHue, setAccentHue, fontSize, setFontSize } = useTheme();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getSettings as () => Promise<Settings>,
  });

  const mutation = useMutation({
    mutationFn: (newSettings: Partial<Settings>) => saveSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Saved", description: "Settings updated." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const checkUpdateMutation = useMutation({
    mutationFn: () => checkUpdate() as Promise<UpdateInfo>,
    onSuccess: (data) => { setUpdateInfo(data); setUpdateError(null); },
    onError: (e: Error) => { setUpdateError(e.message); setUpdateInfo(null); },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-settings-header">
          App <span className="text-primary">Settings</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Customize your preferences</p>
      </div>

      {/* Theme */}
      <Section title="Appearance" icon={Palette} delay={0.04}>
        {/* Mode */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Interface Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "dark", label: "Dark", icon: Moon },
              { value: "light", label: "Light", icon: Sun },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                data-testid={`mode-${value}`}
                onClick={() => setMode(value as "dark" | "light")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150",
                  mode === value
                    ? "bg-primary/12 border-primary/30 text-primary"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Accent Color</p>
          <div className="grid grid-cols-2 gap-2">
            {THEME_COLORS.map((color) => {
              const isSelected = accentHue === color.hue;
              return (
                <button
                  key={color.hue}
                  data-testid={`theme-color-${color.name}`}
                  onClick={() => setAccentHue(color.hue)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all duration-150",
                    isSelected
                      ? "border-primary/40 bg-primary/8"
                      : "border-border/40 bg-secondary/30 hover:border-border/70 hover:bg-secondary/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full shrink-0 transition-all",
                      isSelected ? "ring-2 ring-white/40 ring-offset-1 ring-offset-secondary scale-110" : ""
                    )}
                    style={{ backgroundColor: `hsl(${color.hue}, 72%, 51%)` }}
                  />
                  <span className={cn(
                    "text-[12px] font-semibold",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {color.label}
                  </span>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Font Size</p>
            <span className="text-[11px] font-mono text-primary">{fontSize}px</span>
          </div>
          <div className="flex gap-2">
            {[12, 13, 14, 15, 16].map((size) => (
              <button
                key={size}
                data-testid={`font-size-${size}`}
                onClick={() => setFontSize(size)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                  fontSize === size
                    ? "bg-primary/12 border-primary/30 text-primary"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences" icon={Bell} delay={0.08}>
        <div className="space-y-3">
          {[
            { key: "trayIcon", label: "System Tray Icon", desc: "Show icon in the Windows system tray" },
            { key: "analytics", label: "Anonymous Analytics", desc: "Help improve the app with usage data" },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-secondary/20"
            >
              <div>
                <p className="text-[13px] font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch
                checked={settings?.[key as keyof Settings] as boolean ?? false}
                onCheckedChange={(val) => mutation.mutate({ [key]: val })}
                className="data-[state=checked]:bg-primary shrink-0"
                data-testid={`switch-${key}`}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Updates */}
      <Section title="Updates" icon={Github} delay={0.12}>
        <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Check for Updates</p>
              <p className="text-xs text-muted-foreground mt-0.5">Version: dev</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkUpdateMutation.mutate()}
              disabled={checkUpdateMutation.isPending}
              data-testid="button-check-update"
              className="border-border/60 hover:border-primary/30 text-xs h-7"
            >
              {checkUpdateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check Now"}
            </Button>
          </div>

          {updateInfo && (
            <div className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              updateInfo.isUpToDate
                ? "border-green-500/20 bg-green-500/5"
                : "border-primary/20 bg-primary/5"
            )}>
              {updateInfo.isUpToDate
                ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {updateInfo.isUpToDate ? "You're up to date!" : `Update available: ${updateInfo.latestVersion}`}
                </p>
                {!updateInfo.isUpToDate && (
                  <button
                    onClick={() => openUrl(updateInfo.releaseUrl)}
                    className="text-xs text-primary mt-1 hover:underline"
                  >
                    Download update →
                  </button>
                )}
              </div>
            </div>
          )}
          {updateError && (
            <p className="text-xs text-destructive">{updateError}</p>
          )}
        </div>

        <Button
          variant="outline"
          className="border-border/60 hover:border-primary/30 text-xs h-8 w-full"
          onClick={() => openUrl("https://github.com/JaidenGoode/JGoodeA.I.O_PC_Tool")}
          data-testid="button-github"
        >
          <Github className="h-3.5 w-3.5 mr-2" />
          View on GitHub
        </Button>
      </Section>
    </div>
  );
}
