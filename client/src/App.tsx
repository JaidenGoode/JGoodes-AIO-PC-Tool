import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { DetectProvider } from "@/hooks/detect-context";
import { AnimatePresence, motion } from "framer-motion";

import Dashboard from "@/pages/dashboard";
import Tweaks from "@/pages/tweaks";
import DNSManager from "@/pages/dns-manager";
import Cleaner from "@/pages/cleaner";
import Debloat from "@/pages/debloat";
import RestorePoints from "@/pages/restore-points";
import Utilities from "@/pages/utilities";
import Programs from "@/pages/programs";
import Settings from "@/pages/settings";
import Startup from "@/pages/startup";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.13 } },
  exit:    { opacity: 0, transition: { duration: 0.08 } },
};

function AnimatedRoutes() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", willChange: "opacity" }}
      >
        <Switch location={location}>
          <Route path="/" component={Dashboard}/>
          <Route path="/tweaks" component={Tweaks}/>
          <Route path="/dns" component={DNSManager}/>
          <Route path="/cleaner" component={Cleaner}/>
          <Route path="/debloat" component={Debloat}/>
          <Route path="/utilities" component={Utilities}/>
          <Route path="/programs" component={Programs}/>
          <Route path="/startup" component={Startup} />
          <Route path="/restore" component={RestorePoints} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function Router() {
  return (
    <Layout>
      <AnimatedRoutes />
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DetectProvider>
          <TooltipProvider>
            <Toaster />
            <CommandPalette />
            <Router />
          </TooltipProvider>
        </DetectProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
