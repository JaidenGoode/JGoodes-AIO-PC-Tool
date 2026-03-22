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
import RestorePoints from "@/pages/restore-points";
import Utilities from "@/pages/utilities";
import Settings from "@/pages/settings";
import Startup from "@/pages/startup";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -6,  transition: { duration: 0.12, ease: [0.55, 0, 1, 0.45] } },
};

function AnimatedRoutes() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: "100%", height: "100%" }}
      >
        <Switch location={location}>
          <Route path="/" component={Dashboard}/>
          <Route path="/tweaks" component={Tweaks}/>
          <Route path="/dns" component={DNSManager}/>
          <Route path="/cleaner" component={Cleaner}/>
          <Route path="/utilities" component={Utilities}/>
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
