export type ImpactLevel = "High" | "Medium" | "Low";

export const TWEAK_IMPACTS: Record<string, ImpactLevel> = {
  // High — users notice a clear real-world difference
  "Maximum Performance Power Plan":                "High",
  "Disable Mouse Acceleration":                    "High",
  "Disable Multiplane Overlay (MPO)":              "High",
  "GPU & CPU Priority for Games":                  "High",
  "System Responsiveness & Network Throttling":    "High",
  "Disable Dynamic Tick":                          "High",
  "Enable Hardware Accelerated GPU Scheduling (HAGS)": "High",
  "Disable SuperFetch / SysMain":                  "High",
  "Disable Windows File Indexing":                 "High",
  "Debloat Windows":                               "High",
  "Disable Telemetry & Data Collection":           "High",
  "Optimize Visual Effects for Performance":       "High",
  "Disable Power Throttling":                      "High",

  // Medium — measurable improvement, may not be immediately obvious
  "Keep All CPU Cores Active (Unpark Cores)":      "Medium",
  "Minimum Priority for Background Processes":     "Medium",
  "Disable GameBar":                               "Medium",
  "Disable GameBar Background Recording":          "Medium",
  "Disable Nagle's Algorithm":                     "Medium",
  "Enable Game Mode":                              "Medium",
  "Disable Background Apps (Legacy)":              "Medium",
  "Disable Cortana":                               "Medium",
  "Disable Startup Program Delay":                 "Medium",
  "Disable Hibernation":                           "Medium",
  "Disable Full Screen Optimizations":             "Medium",
  "Optimize for Windowed & Borderless Games":      "Medium",
  "Disable Windows TCP Auto-Tuning":               "Medium",
  "Disable Network Power Saving":                  "Medium",
  "Disable Windows Automatic Maintenance":         "Medium",
  "Fortnite Process High Priority":                "Medium",
  "Disable Xbox Core Services":                    "Medium",
  "Disable Web Search in Windows Search":          "Medium",
  "Instant Menu Response (Zero Delay)":            "Medium",
  "Disable NTFS Access Timestamps":                "Medium",

  "Disable Windows Copilot & AI Features":          "Medium",
  "Disable Lock Screen Suggestions & Ads":          "Medium",

  // Low — subtle, background improvements
  "Disable IPv6":                                  "Low",
  "Prefer IPv4 over IPv6":                         "Low",
  "Enable SSD TRIM Optimization":                  "Low",
  "Disable Windows Performance Counters":          "Low",
  "Disable Advertising ID":                        "Low",
  "Disable Activity History & Timeline":           "Low",
  "Disable Customer Experience Improvement Program": "Low",
  "Disable Windows Error Reporting":               "Low",
  "Disable Clipboard History & Cloud Sync":        "Low",
  "Disable Start Menu Suggestions & Tips":         "Low",
  "Debloat Microsoft Edge":                        "Low",
  "Debloat Google Chrome":                         "Low",
  "Debloat Opera GX":                              "Low",
  "Optimize Discord for Gaming":                   "Low",
  "Disable Remote Assistance":                     "Low",
  "Disable Phone Link & Mobile Sync":              "Low",
};

export function getImpact(title: string): ImpactLevel | null {
  return TWEAK_IMPACTS[title] ?? null;
}
