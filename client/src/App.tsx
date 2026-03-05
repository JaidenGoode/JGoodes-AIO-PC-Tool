import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";

import Dashboard from "@/pages/dashboard";
import Tweaks from "@/pages/tweaks";
import DNSManager from "@/pages/dns-manager";
import Cleaner from "@/pages/cleaner";
import RestorePoints from "@/pages/restore-points";
import Utilities from "@/pages/utilities";
import Settings from "@/pages/settings";
import GitHub from "@/pages/github";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/tweaks" component={Tweaks}/>
        <Route path="/dns" component={DNSManager}/>
        <Route path="/cleaner" component={Cleaner}/>
        <Route path="/utilities" component={Utilities}/>
        <Route path="/restore" component={RestorePoints} />
        <Route path="/settings" component={Settings} />
        <Route path="/github" component={GitHub} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <CommandPalette />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
