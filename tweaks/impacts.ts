export type ImpactLevel = "High" | "Medium" | "Low";

export const TWEAK_IMPACTS: Record<string, ImpactLevel> = {
  // High — users notice a clear real-world difference
  "Disable Mouse Acceleration":                    "High",
  "Disable Multiplane Overlay (MPO)":              "High",
  "Maximum Priority for Games":                     "High",
  "High Scheduling Category for Gaming":            "High",
  "System Responsiveness & Network Throttling":    "High",
  "Disable Dynamic Tick":                          "High",
  "Enable Hardware Accelerated GPU Scheduling (HAGS)": "High",
  "Disable SuperFetch / SysMain":                  "High",
  "Disable Windows File Indexing":                 "High",
  "Optimize Visual Effects for Performance":       "High",
  "Disable Power Throttling":                      "High",
  "Enable MSI Mode for GPU":                       "High",
  "Global Timer Resolution for Gaming":            "High",
  "Disable Background UWP Apps":                   "Medium",

  // Medium — measurable improvement, may not be immediately obvious
  "Keep All CPU Cores Active (Unpark Cores)":      "Medium",
  "Win32 Priority Separation":                     "Medium",
  "Disable GameBar":                               "Medium",
  "Disable GameBar Background Recording":          "Medium",
  "Disable Nagle's Algorithm":                     "Medium",
  "Enable Game Mode":                              "Medium",

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

  // Low — subtle, background improvements
  "Disable IPv6":                                  "Low",
  "Prefer IPv4 over IPv6":                         "Low",
  "Enable SSD TRIM Optimization":                  "Low",
  "Disable Windows Performance Counters":          "Low",
  "Disable Remote Assistance":                     "Low",
  "Disable Phone Link & Mobile Sync":              "Low",

  // Performance (Cortex Disk Cache & Desktop Menu)
  "Auto-End Unresponsive Programs":                "Medium",
  "Disable Scheduled Disk Defragmentation":        "Medium",
  "Keep Kernel & Drivers in RAM":                  "High",
  "Disable Memory Compression":                    "High",
  "Release Unused DLLs from Memory":               "Medium",
  "Svchost Process Isolation":                     "Medium",
  "Disable 8.3 Short File Names":                  "Low",
  "Optimize Boot Configuration":                   "Medium",
  "Increase System I/O Performance":               "Medium",

  // System (Cortex Desktop Menu & Network)
  "Disable Taskbar & Menu Animations":             "Low",
  "Disable Startup Disk Check":                    "Low",
  "Reduce Taskbar Preview Delay":                  "Low",
  "Disable AutoPlay for External Devices":         "Low",
  "Disable Notification Center":                   "Medium",
  "Reduce Keyboard Input Delay":                   "Low",
  "Increase Network Buffer Size":                  "Medium",
  "Optimize TCP/IP Network Stack":                 "High",
  "Optimize DNS Resolution":                       "Medium",
  "Unlock Reserved Network Bandwidth":             "High",
  "Increase Browser Connection Limits":            "Medium",

  // Network
  "Disable SMBv1 Protocol":                        "Medium",
  "Enable Receive Side Scaling (RSS)":             "Medium",
  "Disable Delivery Optimization Service":         "High",

  // Services (additional)
  "Disable Print Spooler (Spooler)":               "Medium",
  "Disable Fax Service (Fax)":                     "Low",
  "Disable Distributed Link Tracking (TrkWks)":   "Low",
  "Disable Program Compatibility Assistant (PcaSvc)": "Low",
  "Disable Touch Keyboard Service (TabletInputService)": "Low",
  "Disable Windows Insider Service (wisvc)":       "Low",

  // Services
  "Disable BranchCache (PeerDistSvc)":             "Low",
  "Disable iSCSI Initiator (MSiSCSI)":             "Low",
  "Disable SNMP Trap (SNMPTRAP)":                  "Low",
  "Disable Certificate Propagation (CertPropSvc)": "Low",
  "Disable ActiveX Installer (AxInstSV)":          "Low",
  "Disable Application Management (AppMgmt)":      "Low",
  "Disable Remote Registry (RemoteRegistry)":      "Medium",
  "Disable Smart Card Removal Policy (SCPolicySvc)": "Low",
  "Disable WebDAV Client (WebClient)":             "Low",
  "Disable Windows Remote Management (WinRM)":     "Medium",
  "Disable Offline Files (CscService)":            "Low",
  "Disable Peer Name Resolution (PNRPsvc)":        "Low",
  "Disable Peer Networking (p2psvc)":              "Low",
  "Disable Peer Networking Identity (p2pimsvc)":   "Low",

  // Gaming (additional)
  "Disable HPET (Platform Clock)":                 "Medium",
  "Disable Auto-Restart After Windows Updates":    "Medium",

  // Services (additional)
  "Disable IP Helper Service (iphlpsvc)":          "Low",
  "Disable Diagnostic Policy Service (DPS)":       "Low",

  // Performance (additional)
  "Disable Transparency Effects":                  "Low",

  // Gaming (Razer Cortex Speed Up style)
  "Disable USB Selective Suspend":                 "Medium",
  "Set TSC Sync Policy (Precise Game Timing)":     "Medium",

  // Network (Razer Cortex Speed Up style)
  "Enable TCP Fast Open":                          "Medium",
  "Disable NIC Interrupt Moderation":              "Medium",

  // Services (Windows Service Optimization)
  "Disable Secondary Logon (seclogon)":            "Low",
  "Disable WMI Performance Adapter (wmiApSrv)":   "Low",
  "Disable TCP/IP NetBIOS Helper (lmhosts)":      "Low",
  "Disable Telephony Service (TapiSrv)":          "Low",
  "Disable Still Image Service (StiSvc)":         "Low",
  "Disable Bluetooth Support Service (bthserv)":  "Low",
  "Disable Net.TCP Port Sharing (NetTcpPortSharing)": "Low",
  "Disable Remote Access Manager (RasMan)":        "Low",
};

export function getImpact(title: string): ImpactLevel | null {
  return TWEAK_IMPACTS[title] ?? null;
}
