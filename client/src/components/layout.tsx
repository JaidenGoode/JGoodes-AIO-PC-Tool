import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ShieldCheck } from "lucide-react";
import { useTheme, THEME_COLORS } from "./theme-provider";
import { cn } from "@/lib/utils";

interface LayoutProps { children: ReactNode; }

function openCommandPalette() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
  );
}

export function Layout({ children }: LayoutProps) {
  const { accentHue, setAccentHue, toggleMode, mode } = useTheme();
  const style = { "--sidebar-width": "15rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Header */}
          <header
            className="relative flex h-11 shrink-0 items-center justify-between gap-3 px-4 bg-background/90 sticky top-0 z-50"
            style={{ backdropFilter: "blur(20px)" }}
          >
            {/* Gradient border bottom */}
            <div className="absolute inset-x-0 bottom-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(var(--border)) 20%, hsl(var(--primary)/0.35) 50%, hsl(var(--border)) 80%, transparent 100%)"
              }}
            />

            <div className="flex items-center gap-2.5">
              <SidebarTrigger
                data-testid="button-sidebar-toggle"
                className="text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 rounded-md p-1.5 h-7 w-7 transition-all duration-150"
              />
              <div className="h-3.5 w-px bg-border/50 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/40 font-mono tracking-wide uppercase">
                  JGoode
                </span>
                <span className="text-[11px] text-primary/70 font-bold font-mono tracking-wide uppercase">
                  A.I.O
                </span>
                <span className="text-[11px] text-muted-foreground/40 font-mono tracking-wide uppercase">
                  PC Tool
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Ctrl+K command palette trigger */}
              <button
                data-testid="button-command-palette"
                onClick={openCommandPalette}
                className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground/30 bg-secondary/30 border border-border/20 px-2.5 py-1.5 rounded-lg hover:text-muted-foreground/60 hover:border-border/40 hover:bg-secondary/50 transition-all duration-150 font-mono"
              >
                <span>Search</span>
                <div className="flex items-center gap-0.5 ml-0.5">
                  <kbd className="text-[8px] px-1 py-0.5 rounded border border-border/30 bg-secondary/50">Ctrl</kbd>
                  <span className="text-[8px] opacity-40">+</span>
                  <kbd className="text-[8px] px-1 py-0.5 rounded border border-border/30 bg-secondary/50">K</kbd>
                </div>
              </button>

              {/* Color swatches */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/40 border border-border/30">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color.hue}
                    data-testid={`color-swatch-${color.name}`}
                    onClick={() => setAccentHue(color.hue)}
                    title={color.label}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all duration-200 shrink-0",
                      accentHue === color.hue
                        ? "ring-2 ring-white/50 ring-offset-1 ring-offset-background scale-125"
                        : "opacity-50 hover:opacity-90 hover:scale-110"
                    )}
                    style={{ backgroundColor: `hsl(${color.hue}, 72%, 51%)` }}
                  />
                ))}
              </div>

              {/* Mode toggle */}
              <button
                data-testid="button-theme-toggle"
                onClick={toggleMode}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all duration-150",
                  mode === "dark"
                    ? "text-muted-foreground/50 bg-secondary/40 border-border/30 hover:text-foreground"
                    : "text-foreground bg-secondary/60 border-border/50 hover:bg-secondary"
                )}
              >
                {mode === "dark" ? (
                  <span className="text-[10px]">◐ DARK</span>
                ) : (
                  <span className="text-[10px]">◑ LIGHT</span>
                )}
              </button>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/40 border border-border/30 px-2.5 py-1.5 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <ShieldCheck className="h-3 w-3 text-primary hidden sm:block" />
                <span className="hidden sm:inline font-semibold tracking-wide text-primary/70">ACTIVE</span>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto w-full">
            <div className="container mx-auto p-5 md:p-7 max-w-[1600px]">
              {children}
            </div>
          </main>

          {/* Status bar */}
          <div className="relative flex items-center justify-between h-6 px-4 bg-secondary/10 shrink-0">
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, hsl(var(--border)/0.6) 30%, hsl(var(--border)/0.6) 70%, transparent 100%)" }}
            />
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground/40 font-mono">v2.5.0</span>
              <span className="text-[10px] text-muted-foreground/20">|</span>
              <span className="text-[10px] text-muted-foreground/40 font-mono">JGoode A.I.O PC Tool</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary/50" />
              <span className="text-[10px] text-muted-foreground/40 font-mono">ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
