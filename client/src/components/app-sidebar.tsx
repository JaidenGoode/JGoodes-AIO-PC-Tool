import { Link, useLocation } from "wouter";
import { SiDiscord, SiGithub } from "react-icons/si";
import {
  LayoutDashboard, Wrench, Box, Sparkles, RotateCcw,
  Globe, Settings, ChevronRight,
} from "lucide-react";
import { openUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";

const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      { title: "Dashboard",   url: "/",          icon: LayoutDashboard },
      { title: "PC Cleaner",  url: "/cleaner",   icon: Sparkles },
      { title: "Tweaks",      url: "/tweaks",    icon: Wrench },
      { title: "Utilities",   url: "/utilities", icon: Box },
    ],
  },
  {
    label: "NETWORK",
    items: [
      { title: "DNS Manager", url: "/dns", icon: Globe },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { title: "Restore",   url: "/restore",   icon: RotateCcw },
      { title: "Settings",  url: "/settings",  icon: Settings },
      { title: "GitHub",    url: "/github",    icon: SiGithub as unknown as React.ElementType },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Brand header */}
      <SidebarHeader className="px-3 pt-4 pb-3 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 px-1 hover:opacity-85 transition-opacity">
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md"
              style={{ boxShadow: "0 0 18px hsl(var(--primary) / 0.35)" }}
            >
              <img
                src="/logo.png"
                alt=""
                className="w-full h-full rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<span class="text-white font-black text-sm leading-none">J</span>';
                }}
              />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-black text-foreground leading-none tracking-tight">
              JGoode<span className="text-primary">'s</span>
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-semibold leading-tight mt-0.5 tracking-widest uppercase font-mono">
              A.I.O PC Tool
            </span>
          </div>
        </Link>

        {/* Admin badge */}
        <div className="mt-3 mx-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/8 border border-primary/15">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-primary/80 font-bold tracking-widest uppercase font-mono">
            Administrator
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-2 gap-0">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-[9px] font-black text-muted-foreground/25 uppercase tracking-[0.2em] px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "rounded-lg h-8 transition-all duration-150 group relative",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground/50 hover:text-foreground/80 hover:bg-sidebar-accent"
                        )}
                      >
                        <Link href={item.url} className="flex items-center gap-2.5 px-2.5">
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                          )}
                          <item.icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              isActive ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
                            )}
                          />
                          <span className={cn(
                            "text-[12px] flex-1 transition-colors",
                            isActive ? "font-semibold text-primary" : "font-medium"
                          )}>
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-2 border-t border-sidebar-border/50">
        <button
          data-testid="button-discord"
          onClick={() => openUrl("https://discord.gg/dUd3jQ6zC8")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent border border-sidebar-border/30 hover:border-primary/15 transition-all duration-150 group"
        >
          <SiDiscord className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground/60 group-hover:text-foreground/80 leading-none transition-colors">
              Join Discord
            </p>
            <p className="text-[9px] text-muted-foreground/30 mt-0.5">Community & Support</p>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
