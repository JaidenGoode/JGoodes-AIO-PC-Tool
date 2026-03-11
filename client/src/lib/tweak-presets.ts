import { Gamepad2, Shield, Zap, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TweakPreset {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  titles: string[];
}

export const TWEAK_PRESETS: TweakPreset[] = [
  {
    id: "gaming",
    name: "Gaming",
    description: "All gaming tweaks + key performance boosts for max FPS",
    Icon: Gamepad2,
    color: "text-green-400",
    bgColor: "hover:bg-green-500/10",
    borderColor: "hover:border-green-500/30",
    titles: [
      "Disable Mouse Acceleration",
      "Keep All CPU Cores Active (Unpark Cores)",
      "System Responsiveness for Games",
      "GPU Priority for Games",
      "Disable Network Power Saving",
      "Disable GameBar",
      "Disable GameBar Background Recording",
      "Optimize for Windowed & Borderless Games",
      "Enable Game Mode",
      "Enable Hardware Accelerated GPU Scheduling (HAGS)",
      "Instant Menu Response (Zero Delay)",
      "Disable Full Screen Optimizations",
      "System Responsiveness & Network Throttling",
      "Maximum Priority for Games",
      "Disable Dynamic Tick",
      "Disable Nagle's Algorithm",
      "Disable Xbox Core Services",
      "Maximum Performance Power Plan",
      "Disable Multiplane Overlay (MPO)",
      "Disable Power Throttling",
    ],
  },
  {
    id: "privacy",
    name: "Privacy",
    description: "Disables tracking, remote access, and data-sharing Windows features",
    Icon: Shield,
    color: "text-blue-400",
    bgColor: "hover:bg-blue-500/10",
    borderColor: "hover:border-blue-500/30",
    titles: [
      "Disable Web Search in Windows Search",
      "Disable Cortana",
      "Disable Remote Assistance",
      "Disable Phone Link & Mobile Sync",
      "Disable Windows Remote Management (WinRM)",
      "Disable Remote Registry (RemoteRegistry)",
      "Disable LLMNR Protocol",
      "Disable NetBIOS over TCP/IP",
      "Disable mDNS Multicast",
      "Disable Delivery Optimization Service",
    ],
  },
  {
    id: "performance",
    name: "Performance",
    description: "Speeds up Windows, reduces background overhead and disk activity",
    Icon: Zap,
    color: "text-yellow-400",
    bgColor: "hover:bg-yellow-500/10",
    borderColor: "hover:border-yellow-500/30",
    titles: [
      "Maximum Performance Power Plan",
      "Disable SuperFetch / SysMain",
      "Disable NTFS Access Timestamps",
      "Disable Windows Performance Counters",
      "Disable Windows File Indexing",
      "Disable Multiplane Overlay (MPO)",
      "Disable Hibernation",
      "Optimize Visual Effects for Performance",
      "System Responsiveness for Games",
      "GPU Priority for Games",
      "Disable Power Throttling",
      "Disable Startup Program Delay",
      "Disable Windows Automatic Maintenance",
      "Enable SSD TRIM Optimization",
      "Disable Windows TCP Auto-Tuning",
    ],
  },
  {
    id: "all",
    name: "Select All",
    description: "Enable every tweak at once",
    Icon: Sparkles,
    color: "text-primary",
    bgColor: "hover:bg-primary/10",
    borderColor: "hover:border-primary/30",
    titles: [],
  },
];
