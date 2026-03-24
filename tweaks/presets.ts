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
    color: "text-primary",
    bgColor: "hover:bg-primary/10",
    borderColor: "hover:border-primary/30",
    titles: [
      "Disable Mouse Acceleration",
      "Keep All CPU Cores Active (Unpark Cores)",
      "System Responsiveness & Network Throttling",
      "Disable GameBar",
      "Disable GameBar Background Recording",
      "Optimize for Windowed & Borderless Games",
      "Enable Game Mode",
      "Enable Hardware Accelerated GPU Scheduling (HAGS)",
      "Instant Menu Response (Zero Delay)",
      "Disable Full Screen Optimizations",
      "Maximum Priority for Games",
      "Disable Power Throttling",
    ],
  },
  {
    id: "privacy",
    name: "Privacy",
    description: "Disables tracking, remote access, and data-sharing Windows features",
    Icon: Shield,
    color: "text-primary",
    bgColor: "hover:bg-primary/10",
    borderColor: "hover:border-primary/30",
    titles: [
      "Disable Web Search in Windows Search",
      "Disable Cortana",
      "Disable Remote Assistance",
      "Disable Phone Link & Mobile Sync",
      "Disable Connected Telemetry (DiagTrack)",
      "Disable Application Compatibility Telemetry",
      "Disable Windows Activity History",
      "Disable Windows Advertising ID",
      "Disable Windows Content Delivery Manager",
      "Disable Clipboard History Collection",
    ],
  },
  {
    id: "performance",
    name: "Performance",
    description: "Speeds up Windows, reduces background overhead and disk activity",
    Icon: Zap,
    color: "text-primary",
    bgColor: "hover:bg-primary/10",
    borderColor: "hover:border-primary/30",
    titles: [
      "Disable NTFS Access Timestamps",
      "Disable Windows Performance Counters",
      "Disable Windows File Indexing",
      "Disable Hibernation",
      "Optimize Visual Effects for Performance",
      "System Responsiveness & Network Throttling",
      "Disable Power Throttling",
      "Disable Startup Program Delay",
      "Disable Windows Automatic Maintenance",
      "Enable SSD TRIM Optimization",

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
