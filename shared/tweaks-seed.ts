export interface TweakSeed {
  title: string;
  description: string;
  category: string;
  isActive: boolean;
  warning: string | null;
  featureBreaks: string | null;
}

export const TWEAKS_SEED: TweakSeed[] = [
  // ── DEBLOAT ──────────────────────────────────────────────────────────────────
  {
    title: "Debloat Windows",
    description: "Applies a comprehensive Windows debloat: removes OneDrive, disables consumer features, telemetry, Explorer automatic folder discovery, PowerShell 7 telemetry, Windows Platform Binary Table (WPBT), widgets, enables 'End Task' via right-click, shows hidden files, removes Home & Gallery from Explorer, disables Storage Sense, turns off Sticky Keys, enables detailed BSOD, applies Windows dark theme, and sets non-essential services to manual start.",
    category: "debloat",
    isActive: false,
    warning: null,
    featureBreaks: "OneDrive removed. Widgets disabled. Some Microsoft features/services disabled. Storage Sense off. Sticky Keys disabled. Reversible individually."
  },

  // ── PRIVACY ──────────────────────────────────────────────────────────────────
  {
    title: "Disable Telemetry & Data Collection",
    description: "Stops Windows from sending usage, diagnostic, and crash data to Microsoft. Includes disabling the Connected User Experiences service, telemetry scheduled tasks, and setting diagnostic data to minimum.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Microsoft may not receive crash reports. Windows feedback prompts disabled."
  },
  {
    title: "Disable Advertising ID",
    description: "Resets and disables the Advertising ID used for personalized ads across apps. Prevents apps from profiling your usage for targeted advertising.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Personalized ad experiences in apps will be disabled."
  },
  {
    title: "Disable Activity History & Timeline",
    description: "Stops Windows from recording which apps and files you open, and disables syncing activity to Microsoft servers. Removes Timeline feature.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Windows Timeline feature disabled. Activity sync across devices stops."
  },
  {
    title: "Disable Customer Experience Improvement Program",
    description: "Opts out of Microsoft's CEIP which silently collects data about how you use Windows to send to Microsoft.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Microsoft won't improve certain features based on your usage patterns."
  },
  {
    title: "Disable Windows Error Reporting",
    description: "Prevents Windows from automatically sending error and crash reports to Microsoft after a program crash.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Microsoft won't receive crash data. Some apps may not offer automatic troubleshooting."
  },
  {
    title: "Disable Clipboard History & Cloud Sync",
    description: "Disables the clipboard history feature (Win+V) and stops clipboard content from being synced to the cloud or other devices via your Microsoft account.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Win+V clipboard history disabled. Clipboard no longer syncs between devices."
  },
  {
    title: "Disable Start Menu Suggestions & Tips",
    description: "Removes app suggestions, ads, and tips from the Start menu, Settings app, and Windows tips notifications. Disables suggested content throughout Windows.",
    category: "privacy",
    isActive: false,
    warning: null,
    featureBreaks: "Microsoft app suggestions and promotional content disabled in Start and Settings."
  },

  // ── PERFORMANCE ──────────────────────────────────────────────────────────────
  {
    title: "Maximum Performance Power Plan",
    description: "Activates the hidden Ultimate Performance power plan which prevents CPU from throttling and keeps all components at maximum performance at all times. Best for desktop PCs connected to mains power.",
    category: "performance",
    isActive: false,
    warning: "LAPTOP USERS: This disables CPU power throttling entirely, which significantly increases battery drain and heat output. Only use this on laptops when plugged into mains power. Desktop users get full benefit with no drawbacks.",
    featureBreaks: "Significantly higher power consumption and heat. Not suitable for laptops on battery power."
  },
  {
    title: "Disable SuperFetch / SysMain",
    description: "Stops the SysMain (SuperFetch) service which preloads frequently used apps into RAM. Provides the greatest benefit on HDDs (traditional spinning drives) where load times are long. On NVMe/SSD systems the improvement is minimal since SSDs already load apps near-instantly.",
    category: "performance",
    isActive: false,
    warning: "HDD USERS: Recommended — SysMain causes significant unnecessary disk writes on spinning drives. SSD/NVMe USERS: Benefit is minimal. Safe to apply either way, but impact varies by storage type.",
    featureBreaks: "Apps may load slightly slower on first launch on HDD systems. Negligible difference on SSD/NVMe."
  },
  {
    title: "Disable NTFS Access Timestamps",
    description: "Disables the automatic recording of last-access timestamps on NTFS files and folders, reducing unnecessary disk writes and slightly improving I/O performance.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Some backup or sync software that tracks file access times may not work correctly."
  },
  {
    title: "Disable Windows Performance Counters",
    description: "Disables background performance monitoring counters that constantly collect system metrics. Frees up minor CPU overhead.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Task Manager performance details may be reduced. Performance monitoring apps affected."
  },
  {
    title: "Disable Windows File Indexing",
    description: "Stops the Windows Search Indexer from continuously indexing files in the background. HDD users will see the biggest benefit — indexing causes constant disk activity on spinning drives. On SSDs the improvement is smaller, but it still eliminates unnecessary background writes that reduce SSD lifespan over time.",
    category: "performance",
    isActive: false,
    warning: "HDD USERS: Strongly recommended — background indexing is one of the main causes of HDD slowness. SSD USERS: Lower but still worthwhile benefit for reducing background disk writes.",
    featureBreaks: "Windows Search will be slower as it searches without an index. Typing in File Explorer search bar will be slower."
  },
  {
    title: "Disable Multiplane Overlay (MPO)",
    description: "Disables the GPU Multiplane Overlay feature which is known to cause stuttering, flickering, and frame pacing issues in many games on NVIDIA and AMD dedicated graphics cards. Only applies to systems with a discrete (dedicated) GPU.",
    category: "performance",
    isActive: false,
    warning: "DISCRETE GPU REQUIRED: This tweak only applies to systems with a dedicated NVIDIA or AMD graphics card. If you only have Intel/AMD integrated graphics (no dedicated GPU), this tweak has no effect and can be skipped.",
    featureBreaks: "Overlapping windows may use slightly more GPU bandwidth. Fixes stuttering and flickering for most games with dedicated GPU."
  },
  {
    title: "Disable Hibernation",
    description: "Disables hibernation mode and deletes the hiberfil.sys file, freeing disk space equal to your total installed RAM (e.g. 16GB RAM = 16GB freed). Desktop users who never hibernate gain free space with no downside.",
    category: "performance",
    isActive: false,
    warning: "LAPTOP USERS: Only apply if you never use hibernation. Hibernation saves your full RAM state to disk before powering off — useful for resuming exactly where you left off after a full shutdown. This also disables Fast Startup. Desktop users can apply safely.",
    featureBreaks: "Hibernation disabled. Fast Startup disabled (uses full boot instead). Free space gained equals your total RAM amount."
  },
  {
    title: "Disable Background Apps (Legacy)",
    description: "Disables background app access for UWP (Universal Windows Platform) apps. Note: This setting was removed in Windows 11 but the underlying registry policy still functions.",
    category: "performance",
    isActive: false,
    warning: "This setting was removed from Windows 11 Settings UI but the registry policy still works.",
    featureBreaks: "UWP apps (Mail, Calendar, etc.) won't refresh in background. Push notifications may be delayed."
  },
  {
    title: "Optimize Visual Effects for Performance",
    description: "Sets Windows to 'Adjust for best performance' mode which disables all visual effects including window animations, drop shadows, fading menus, smooth scrolling, and transparent glass effects. Reduces Desktop Window Manager CPU and GPU overhead, freeing resources for games and applications.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Windows looks more basic — no animations, shadows, transparency, or fading effects. Appearance can be fully restored in Control Panel → System → Advanced → Performance Settings."
  },
  {
    title: "Disable Cortana",
    description: "Disables Cortana (Windows AI assistant) via Group Policy registry keys, preventing it from loading at startup and running background processes. Also blocks Cortana from intercepting Start menu search queries. Basic local file and app search in the taskbar remains fully functional.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Cortana voice assistant and AI features disabled. Start menu search still works for local files and apps. Web search from taskbar search bar disabled."
  },

  // ── GAMING ───────────────────────────────────────────────────────────────────
  {
    title: "Disable Mouse Acceleration",
    description: "Turns off Windows Pointer Precision (mouse acceleration), giving a true 1:1 relationship between physical mouse movement and on-screen cursor movement. Essential for FPS gaming.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Mouse movement will feel different if you are used to acceleration. Requires re-adjustment of sensitivity."
  },
  {
    title: "Keep All CPU Cores Active (Unpark Cores)",
    description: "Forces all CPU cores to remain active and prevents Windows from parking (powering down) idle cores. Reduces latency spikes caused by cores waking up mid-game.",
    category: "gaming",
    isActive: false,
    warning: "⚠️ NOT RECOMMENDED for AMD Ryzen X3D processors (5800X3D, 7800X3D, 7950X3D, 9800X3D etc.) — the X3D cache thermal design relies on Windows core parking for temperature management. Forcing cores active can cause thermal issues.",
    featureBreaks: "Higher idle power consumption. All cores stay fully active permanently."
  },
  {
    title: "Minimum Priority for Background Processes",
    description: "Sets the CPU scheduling policy so background processes are assigned lower priority than foreground applications. Games get more CPU time while idle background tasks get less.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background downloads, updates, and tasks will be slower while gaming."
  },
  {
    title: "Disable Network Power Saving",
    description: "Prevents Windows from reducing the power state of the network adapter to save energy, eliminating network latency spikes that occur when the adapter wakes from sleep.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly higher power draw from the network adapter. Beneficial for gaming and streaming."
  },
  {
    title: "Disable GameBar",
    description: "Completely disables the Xbox GameBar overlay. Removes background GameBar processes and prevents it from hooking into games, freeing up minor system resources.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Cannot use GameBar overlay (Win+G). Screenshot/clip shortcuts via GameBar disabled."
  },
  {
    title: "Disable GameBar Background Recording",
    description: "Disables the background game clip recording feature (Game DVR) which constantly monitors and records your gameplay in a rolling buffer, even when you're not clipping.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "No automatic background game clip recording. Manual clips with GameBar still work if GameBar is enabled."
  },
  {
    title: "Optimize for Windowed & Borderless Games",
    description: "Applies DWM (Desktop Window Manager) tweaks to reduce latency in windowed and borderless fullscreen mode. Enables hardware-accelerated presentation and reduces compositor overhead.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Minimal. May affect desktop compositing effects slightly."
  },
  {
    title: "Enable Game Mode",
    description: "Turns on Windows Game Mode which prioritizes CPU and GPU resources for the active game, reduces background task interference, and improves frame rate consistency.",
    category: "gaming",
    isActive: false,
    warning: "Do NOT enable if you use Process Lasso — they conflict with each other's process priority management and can cause instability.",
    featureBreaks: "Background processes get fewer resources while gaming. Disable if using Process Lasso."
  },
  {
    title: "Enable Hardware Accelerated GPU Scheduling (HAGS)",
    description: "Allows the GPU to manage its own video memory and scheduling directly, reducing CPU bottleneck in rendering and lowering input lag in supported games.",
    category: "gaming",
    isActive: false,
    warning: "Requires NVIDIA GTX 10-series or AMD RX 5000+ GPU and Windows 10 version 2004 or newer. May cause instability on some older GPU models. Test after enabling.",
    featureBreaks: "Restart required. May cause issues on older or unsupported GPUs. Disable if you see black screens or crashes."
  },
  {
    title: "Instant Menu Response (Zero Delay)",
    description: "Sets the MenuShowDelay registry value to 0ms, removing the built-in delay before Windows context menus and dropdown menus appear. Makes UI feel more responsive.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Menus appear instantly without animation delay. Purely visual change with no side effects."
  },
  {
    title: "Disable Full Screen Optimizations",
    description: "Prevents Windows from modifying how fullscreen applications run. Some users report fewer stutters and better exclusive fullscreen behavior with this disabled system-wide.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Some DirectX 12 games may not benefit from Windows fullscreen optimizations. Test per-game if issues arise."
  },
  {
    title: "System Responsiveness & Network Throttling",
    description: "Sets NetworkThrottlingIndex to 10 and SystemResponsiveness to 10 in the Windows Multimedia System Profile registry keys. NetworkThrottlingIndex prevents Windows from aggressively throttling network packets for multimedia apps, and SystemResponsiveness reserves less CPU for background tasks — both reduce latency and improve real-time gaming performance.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly more CPU time allocated to foreground tasks. Background downloads/tasks may be marginally slower during gaming."
  },
  {
    title: "GPU & CPU Priority for Games",
    description: "Configures the Windows Multimedia SystemProfile Tasks\\Games entry with: GPU Priority 8 (max), CPU Priority 6 (High), Scheduling Category High, SFIO Priority High, and Latency Sensitive True. This tells the Windows scheduler to treat any process registered as a game with maximum hardware priority, reducing frame pacing issues and input lag.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive fewer scheduler slots while a game is running. No side effects outside of gaming."
  },
  {
    title: "Fortnite Process High Priority",
    description: "FORTNITE PLAYERS ONLY. Applies Image File Execution Options (IFEO) for FortniteClient-Win64-Shipping.exe: sets CPU priority class to Realtime (3) and I/O priority to High (3). Ensures Fortnite always gets maximum CPU and disk access priority over every other process. No effect if Fortnite is not installed.",
    category: "gaming",
    isActive: false,
    warning: "FORTNITE PLAYERS ONLY — skip this tweak if you do not play Fortnite. ⚠️ Realtime CPU priority is the highest possible level. If Fortnite crashes or freezes, the system may become temporarily unresponsive until the process is killed.",
    featureBreaks: "All other applications get lower CPU priority while Fortnite is running. Background apps may feel sluggish in-game."
  },
  {
    title: "Disable Dynamic Tick",
    description: "Disables the dynamic CPU timer tick so Windows uses a consistent high-resolution 1ms timer at all times instead of an adaptive tick that can cause inconsistent timing. Reduces micro-stutter and frame time variance in games that are sensitive to CPU scheduling precision.",
    category: "gaming",
    isActive: false,
    warning: "Requires a reboot to take effect. Slightly increases idle CPU wake frequency which may marginally raise power consumption and heat on battery-powered devices.",
    featureBreaks: "Requires reboot. Slightly more CPU activity at idle. Most noticeable improvement on systems with tight frame-time requirements."
  },
  {
    title: "Disable Nagle's Algorithm",
    description: "Nagle's Algorithm buffers small outgoing TCP packets together before sending to reduce bandwidth overhead — in online gaming this adds unnecessary latency to every packet. Disabling it via TcpAckFrequency and TCPNoDelay registry keys forces packets to be sent immediately with zero buffering delay, lowering in-game ping response time.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Marginally higher bandwidth usage due to smaller, more frequent packets. Benefit is lower and more consistent in-game ping."
  },
  {
    title: "Disable Xbox Core Services",
    description: "Stops and disables four background Xbox services that run even if you don't use Xbox features: XboxGipSvc, XblAuthManager, XblGameSave, and XboxNetApiSvc. These silently consume RAM and CPU cycles in the background on every Windows install.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Xbox Live features, Xbox controller remapping via Xbox Accessories app, and Xbox Live game saves won't function. Can be re-enabled at any time in Services.msc."
  },

  // ── SYSTEM ───────────────────────────────────────────────────────────────────
  {
    title: "Disable IPv6",
    description: "Completely disables the IPv6 networking protocol stack on all network adapters. Forces all connections to use IPv4 only.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Services and websites that use IPv6 exclusively may be unreachable. Most consumer networks are IPv4 so impact is minimal."
  },
  {
    title: "Prefer IPv4 over IPv6",
    description: "Configures Windows to prefer IPv4 connections over IPv6 when both are available. Keeps IPv6 functional but as a fallback, which can resolve connectivity issues on some networks.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Minimal. IPv6 still works but is deprioritized. Recommended alternative to fully disabling IPv6."
  },
  {
    title: "Enable SSD TRIM Optimization",
    description: "Ensures the TRIM command is enabled for SSDs, which tells the SSD controller to properly erase blocks no longer in use. Maintains SSD performance and longevity over time. HDDs do not support TRIM and are unaffected.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "No negative effects. Safe for all systems. Only affects SSD drives."
  },
  {
    title: "Disable Web Search in Windows Search",
    description: "Removes Bing web search results from the Windows Start menu and taskbar search. Search only shows local files, apps, and settings — eliminating the delay caused by waiting for web results.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Web search results won't appear in Start menu. Must open a browser manually for web searches."
  },
  {
    title: "Disable Windows TCP Auto-Tuning",
    description: "Disables Windows TCP receive window auto-tuning which can sometimes cause higher latency on certain network configurations. Can improve stability and consistency of network connections.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Large file downloads may be slightly slower. Most beneficial for gaming latency. Reversible with: netsh int tcp set global autotuninglevel=normal"
  },
  {
    title: "Disable Startup Program Delay",
    description: "Removes the built-in 10-second startup delay that Windows applies before launching startup programs and services. Applications in your startup list will begin loading immediately after desktop appears.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Startup apps load immediately rather than after a 10-second grace period. No negative effects for most users."
  },
  {
    title: "Disable Windows Automatic Maintenance",
    description: "Stops Windows from automatically running maintenance tasks (disk defragmentation, Windows Defender scans, system diagnostics) in the background. These tasks can cause unexpected CPU and disk spikes during gaming or work.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Automatic maintenance disabled. Remember to occasionally run Disk Cleanup and Windows Defender manually. Automatic defrag disabled (schedule manually if needed for HDD)."
  },
  {
    title: "Disable Power Throttling",
    description: "Disables the Windows Power Throttling feature which reduces CPU power to background processes to save battery. On desktop PCs this only wastes CPU potential. Ensures all apps get consistent CPU access without Windows selectively throttling them.",
    category: "system",
    isActive: false,
    warning: "LAPTOP USERS: Disabling Power Throttling will increase power consumption and heat. Only apply if you are plugged in and want maximum performance. Desktop users have no drawback.",
    featureBreaks: "Background apps may use more CPU power. Battery life reduced on laptops. Desktop users: no negative effect."
  },

  // ── BROWSER ──────────────────────────────────────────────────────────────────
  {
    title: "Debloat Microsoft Edge",
    description: "MICROSOFT EDGE USERS ONLY. Applies comprehensive Edge policies: disables tracking, telemetry, shopping assistant, Copilot, AI features, Sidebar, Bing Chat on new tab, form autofill, credit card autofill, search suggestions, spotlight content, sign-in prompts, enhanced spell check, and Edge bar. Makes Edge a clean, fast browser.",
    category: "browser",
    isActive: false,
    warning: "MICROSOFT EDGE USERS ONLY — skip this if you primarily use Chrome, Firefox, or another browser. The registry policies will still be written but will only affect Edge if it is installed and used.",
    featureBreaks: "Edge Copilot, AI Compose, shopping assistant, Bing Chat, sidebar, and all suggestion features disabled. Edge becomes a clean browser."
  },
  {
    title: "Debloat Google Chrome",
    description: "GOOGLE CHROME USERS ONLY. Disables Chrome hardware acceleration (frees GPU for gaming), disables background running when closed, turns off usage stats and crash reports, disables Google's software reporting tool, and removes Chrome's media router. Only has effect if Chrome is installed.",
    category: "browser",
    isActive: false,
    warning: "GOOGLE CHROME USERS ONLY — skip this if you do not use Chrome as your browser. Safe to skip if you use Edge, Firefox, Opera GX, or another browser.",
    featureBreaks: "Hardware acceleration off — some web video/graphics may render differently. Chrome won't run in background after closing."
  },
  {
    title: "Debloat Opera GX",
    description: "OPERA GX USERS ONLY. Disables Opera GX hardware acceleration for gaming performance, turns off all browser sound effects and GX sounds, sets startup to a clean empty tab, and disables Opera's background processes. Only has effect if Opera GX is installed.",
    category: "browser",
    isActive: false,
    warning: "OPERA GX USERS ONLY — skip this if you do not use Opera GX as your browser. Safe to skip if you use Chrome, Edge, Firefox, or another browser.",
    featureBreaks: "Opera GX sound effects disabled. GPU rendering off. Browser starts with blank page. Background processes disabled."
  },
  {
    title: "Optimize Discord for Gaming",
    description: "DISCORD USERS ONLY. Disables Discord's game overlay (reduces GPU overhead and prevents stuttering), turns off hardware acceleration in Discord, and lowers Discord's process priority so it doesn't compete for CPU time during gaming. No effect if Discord is not installed.",
    category: "browser",
    isActive: false,
    warning: "DISCORD USERS ONLY — skip this if you do not use Discord. Only has effect if Discord is installed. Safe to skip for non-Discord users.",
    featureBreaks: "Discord overlay won't appear over games. Discord animations may be less smooth. Process priority is lowered."
  },
];
