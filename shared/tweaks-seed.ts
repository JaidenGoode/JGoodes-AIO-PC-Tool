export interface TweakSeed {
  title: string;
  description: string;
  category: string;
  isActive: boolean;
  warning: string | null;
  featureBreaks: string | null;
}

export const TWEAKS_SEED: TweakSeed[] = [
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
    title: "Disable Background UWP Apps",
    description: "Prevents Windows Store (UWP) apps such as Spotify, Photos, Mail, Maps, and News from running and consuming CPU and RAM in the background when you are not using them. Sets GlobalUserDisabled=1 in the BackgroundAccessApplications policy key — the cleanest, fully reversible single-value approach. Enabled: 1 — Disabled: 0 (Windows default).",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "UWP apps will not refresh content or receive live tile updates in the background. Opening an app will always show up-to-date content once launched."
  },
  {
    title: "Disable Multiplane Overlay (MPO)",
    description: "Disables the GPU Multiplane Overlay feature which is known to cause stuttering, flickering, and frame pacing issues in many games on NVIDIA and AMD dedicated graphics cards. Only applies to systems with a discrete (dedicated) GPU.",
    category: "gaming",
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
    category: "system",
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
    warning: "Do not use this at the same time as 'System Responsiveness for Games' — both tweaks write the same SystemResponsiveness registry value. If both are applied, whichever runs last wins. Choose one: this tweak sets SystemResponsiveness to 10; the other sets it to 0.",
    featureBreaks: "Slightly more CPU time allocated to foreground tasks. Background downloads/tasks may be marginally slower during gaming."
  },
  {
    title: "Win32 Priority Separation",
    description: "Sets Win32PrioritySeparation to 0x24 (short interval, fixed foreground boost). Controls how the Windows CPU scheduler splits time quanta between foreground and background processes. 0x24 gives the foreground application a fixed quantum boost with short intervals — ideal for gaming. Reverts to 0x26 (short interval, variable boost).",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background processes receive less CPU time during gaming. Revert sets Win32PrioritySeparation back to 0x26."
  },
  {
    title: "Maximum Priority for Games",
    description: "Configures the Windows Multimedia SystemProfile Tasks\\Games entry to give games the highest possible scheduler priority: GPU Priority 8 (max), CPU Priority 6 (High), Scheduling Category High, SFIO Priority High, Background Only False, and Latency Sensitive True. Every process registered as a game gets maximum CPU, GPU, and disk access priority — reduces frame pacing issues and input lag.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive fewer scheduler slots while a game is running. No side effects outside of gaming."
  },
  {
    title: "Enable MSI Mode for GPU",
    description: "Switches the primary GPU from legacy line-based interrupt mode to Message Signaled Interrupts (MSI). MSI mode gives the GPU a direct, low-latency communication channel to the CPU, eliminating shared IRQ conflicts and reducing GPU interrupt latency. Automatically detects your primary GPU's PCI device path — no manual registry editing required. Widely recommended by competitive gaming communities. Requires a restart to take effect.",
    category: "gaming",
    isActive: false,
    warning: "Requires a full system restart to take effect. NVIDIA and AMD discrete GPUs are supported. If you experience GPU instability after enabling, use the Revert button and restart.",
    featureBreaks: "Restart required. If MSI mode causes instability on a specific GPU, revert with the Revert button and restart."
  },
  {
    title: "GPU Priority for Games",
    description: "Sets the GPU Priority value in the Windows Multimedia SystemProfile Tasks\\Games entry to 8 (maximum). This gives game processes the highest possible GPU scheduling priority over background tasks. Default Windows value is 2. Enabled: 8 — Disabled: 2.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive lower GPU scheduling priority while a game is running. No side effects outside of gaming."
  },
  {
    title: "CPU Priority for Games",
    description: "Sets the CPU Priority value in the Windows Multimedia SystemProfile Tasks\\Games entry to 6 (High). This raises the CPU scheduling priority for any process registered as a game, ensuring it gets more CPU time over background tasks. Default Windows value is 2. Enabled: 6 — Disabled: 2.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive fewer CPU scheduling slots while a game is running. No side effects outside of gaming."
  },
  {
    title: "High Scheduling Category for Gaming",
    description: "Sets the Scheduling Category for the Windows Multimedia SystemProfile Tasks\\Games entry to High. This tells the Windows scheduler to give game processes a higher-priority scheduling tier, reducing latency and improving frame consistency compared to the default Medium category.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive fewer scheduling slots while a game is running. No side effects outside of gaming."
  },
  {
    title: "System Responsiveness for Games",
    description: "Sets SystemResponsiveness to 0 in the Windows Multimedia SystemProfile. This removes the CPU reservation that Windows normally holds for background services and lets games use the maximum available CPU time. Default Windows value is 20 (decimal). Enabled: 0 — Disabled: 20.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background system tasks get less reserved CPU time. Revert restores Windows default SystemResponsiveness = 20."
  },
  {
    title: "Fortnite Process High Priority",
    description: "FORTNITE PLAYERS ONLY. Applies Image File Execution Options (IFEO) for FortniteClient-Win64-Shipping.exe: sets CPU priority class to High (5) and I/O priority to High (3). Ensures Fortnite gets elevated CPU and disk access priority over background processes. No effect if Fortnite is not installed.",
    category: "gaming",
    isActive: false,
    warning: "FORTNITE PLAYERS ONLY — skip this tweak if you do not play Fortnite. High CPU priority (not Realtime) is used — safe and stable. Revert returns Fortnite to Normal priority.",
    featureBreaks: "Background applications receive lower CPU scheduling while Fortnite is running. No system stability risk — High priority is below Realtime."
  },
  {
    title: "Global Timer Resolution for Gaming",
    description: "Sets GlobalTimerResolutionRequests to 1 in the Windows kernel session manager. This allows any application or game to request Windows' highest available timer resolution (0.5ms instead of the 15.6ms default). Lower timer resolution means the CPU scheduler wakes up more frequently, resulting in tighter frame timing, reduced micro-stutter, and more consistent frame delivery. Enabled: 1 — Disabled: 0 (Windows default).",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Marginal increase in background CPU wake frequency at idle. No effect on stability or applications outside of gaming."
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
    title: "Disable Teredo IPv6 Tunneling",
    description: "Disables Teredo — a legacy IPv6 tunneling technology that encapsulates IPv6 packets inside IPv4 UDP, creating background connections to Microsoft Teredo relay servers. On gaming PCs with a direct internet connection, Teredo adds latency, creates unnecessary outbound traffic, and is exploited as an attack surface. Disabling it forces direct connections.",
    category: "gaming",
    isActive: false,
    warning: "If you use Xbox services, Xbox Play Anywhere, or some online games that require Teredo for NAT traversal (particularly Xbox-related titles), re-enable this if you experience connection issues.",
    featureBreaks: "Teredo tunneling disabled. Some Xbox-related game connectivity features may require re-enabling. No effect on most gaming."
  },
  {
    title: "Disable HPET (Platform Clock)",
    description: "Disables the High Precision Event Timer (HPET) as the Windows platform clock source via boot configuration. HPET is a hardware timer that Windows uses for scheduling — on many modern CPUs (especially Intel and AMD Ryzen), switching away from HPET to the TSC (CPU's own clock) reduces timer overhead, improves timer resolution consistency, and can lower input latency and micro-stutter in games.",
    category: "gaming",
    isActive: false,
    warning: "Requires a system restart to take effect. On some older systems or specific hardware combinations, disabling HPET may cause instability. Test after reboot — re-enable if you experience BSODs or timing issues.",
    featureBreaks: "Restart required. Windows uses TSC/PM timer instead of HPET. May reduce micro-stutter and improve frame time consistency on modern hardware."
  },
  {
    title: "Disable Auto-Restart After Windows Updates",
    description: "Prevents Windows from automatically rebooting your PC after installing updates — even when you're in the middle of a game or important work. Windows normally schedules forced restarts and can interrupt active sessions. This tweak keeps your PC running until you choose to restart.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows will not auto-restart after updates. You must restart manually to apply updates. Update restarts are still available from Windows Update settings."
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
    description: "MICROSOFT EDGE USERS ONLY. Applies the full set of Edge debloat policies matching ShutUp10/Optimizer recommendations: disables auto-import, personalization/ads, recommendations, first-run experience, Browser Essentials button, and default browser prompts (Annoyances); disables Follow Creators, both Sidebar modes, SmartScreen, Sync, crash restore dialog, Shopping, Rewards, mini context menus, implicit Microsoft Account sign-in, Collections, split screen, User Feedback, floating Bing search bar, and Startup Boost (Features/Bloat); and cleans the New Tab page by hiding pinned sites, quick links, background image, and Microsoft news content. WebView2 is NOT affected — apps that depend on it continue to work normally.",
    category: "browser",
    isActive: false,
    warning: "MICROSOFT EDGE USERS ONLY — skip this if you primarily use Chrome, Firefox, or another browser. WebView2 is fully preserved. All changes are reversible.",
    featureBreaks: "Edge Sidebar, SmartScreen, Sync, Shopping, Rewards, Startup Boost, and New Tab page Microsoft content all disabled. Revert instantly restores all defaults."
  },
  {
    title: "Debloat Google Chrome",
    description: "GOOGLE CHROME USERS ONLY. Disables Chrome hardware acceleration via Windows policy (frees GPU for gaming), disables background running when Chrome is closed, turns off usage stats and crash reports, disables Google's software reporting tool, and removes Chrome's media router. Restart Chrome after applying.",
    category: "browser",
    isActive: false,
    warning: "GOOGLE CHROME USERS ONLY — skip this if you do not use Chrome as your browser. Safe to skip if you use Edge, Firefox, Opera GX, or another browser.",
    featureBreaks: "Hardware acceleration off — Chrome renders without GPU. Chrome won't run in background after closing. Restart Chrome for changes to take effect."
  },
  {
    title: "Debloat Opera GX",
    description: "OPERA GX USERS ONLY. Disables Opera GX hardware acceleration so its GPU usage doesn't compete with games, and disables the GX browser sound effects (GX Corner sounds) that play by default. All changes are made in Opera GX's Preferences file — no registry modifications. Restart Opera GX after applying.",
    category: "browser",
    isActive: false,
    warning: "OPERA GX USERS ONLY — skip this if you do not use Opera GX as your browser. Safe to skip if you use Chrome, Edge, Firefox, or another browser.",
    featureBreaks: "GX Corner sound effects disabled. Hardware acceleration off. Restart Opera GX after applying for changes to take effect."
  },
  {
    title: "Optimize Discord for Gaming",
    description: "DISCORD USERS ONLY. Three changes in one: (1) Sets Discord to Below Normal CPU priority via Windows IFEO — Discord yields CPU to your game only when CPU is contested; voice and audio are completely unaffected as Windows audio system manages those threads independently. (2) Disables hardware acceleration in Discord so its GPU usage does not compete with your game. (3) Disables Discord's in-game overlay which causes stuttering and frame drops on many systems. Restart Discord after applying.",
    category: "browser",
    isActive: false,
    warning: "DISCORD USERS ONLY — skip this if you do not use Discord. No effect if Discord is not installed.",
    featureBreaks: "In-game Discord overlay will not appear over games (recommended to disable for gaming anyway). Discord UI may look slightly less smooth without hardware acceleration."
  },

  // ── SYSTEM (new standalone) ──────────────────────────────────────────────────
  {
    title: "Disable Remote Assistance",
    description: "Prevents Windows from accepting remote assistance connection requests. Remote Assistance allows Microsoft or third parties to view and control your PC when invited. Disabling this removes the attack surface and prevents uninvited remote access.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Cannot use Windows Remote Assistance to get help from another person. Does not affect Remote Desktop."
  },
  {
    title: "Disable Phone Link & Mobile Sync",
    description: "Disables the Phone Link (formerly Your Phone) feature that syncs your Android or iPhone to Windows. Also disables the Connected Device Platform (CDP) that allows cross-device experiences. Reduces background activity and stops Windows from trying to connect to your mobile devices.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Phone Link app cannot sync with your phone. Cross-device clipboard and Continue on PC features disabled."
  },

  // ── PERFORMANCE (Cortex Disk Cache & Desktop Menu Optimization) ────────────
  {
    title: "Auto-End Unresponsive Programs",
    description: "Automatically terminates programs that stop responding instead of waiting indefinitely. Reduces the hung-app timeout from 5 seconds to 1 second and sets Windows to auto-end tasks on shutdown, preventing the 'This app is preventing shutdown' dialog.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Programs that temporarily freeze may be killed before they recover. Unsaved work in frozen apps may be lost."
  },
  {
    title: "Disable Scheduled Disk Defragmentation",
    description: "Disables the Windows scheduled disk defragmentation task that runs automatically in the background. SSD users should disable this — SSDs do not benefit from defragmentation and it causes unnecessary write cycles that reduce SSD lifespan.",
    category: "performance",
    isActive: false,
    warning: "HDD USERS: If you have a traditional spinning hard drive, you may want to run manual defragmentation periodically instead. SSDs should always have this disabled.",
    featureBreaks: "Automatic disk defragmentation disabled. Run manually via Defragment and Optimize Drives if needed for HDD."
  },
  {
    title: "Keep Kernel & Drivers in RAM",
    description: "Forces the Windows kernel and device drivers to remain in physical RAM at all times instead of being paged to the swap file. Reduces latency for system calls and driver operations. Most beneficial on systems with 8GB+ RAM.",
    category: "performance",
    isActive: false,
    warning: "Requires sufficient RAM (8GB+). On systems with low RAM (4GB or less), this may reduce available memory for applications.",
    featureBreaks: "Slightly higher base RAM usage. Kernel and drivers never swapped to disk."
  },
  {
    title: "Disable Memory Compression",
    description: "Disables the Windows Memory Compression feature which compresses inactive pages in RAM instead of writing them to the page file. While this saves disk I/O, the compression/decompression uses CPU cycles. Disabling it on systems with plenty of RAM (16GB+) frees CPU resources.",
    category: "performance",
    isActive: false,
    warning: "Only recommended for systems with 16GB+ RAM. On systems with limited RAM, memory compression helps avoid excessive paging to disk which would be slower.",
    featureBreaks: "Windows will page to disk instead of compressing memory. May increase page file usage on low-RAM systems."
  },
  {
    title: "Release Unused DLLs from Memory",
    description: "Configures Windows to automatically unload DLL libraries from memory when they are no longer being used by any application. Frees RAM that would otherwise be held by idle shared libraries.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Applications that frequently reload the same DLLs may have slightly longer load times. Frees RAM for other tasks."
  },
  {
    title: "Svchost Process Isolation",
    description: "Lowers the memory threshold at which Windows splits services into individual svchost.exe processes rather than grouping them. Improves system stability by isolating services — if one service crashes, it won't take down other services running in the same process.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly more svchost.exe processes visible in Task Manager. Each uses a small amount of additional RAM but improves stability."
  },
  {
    title: "Disable 8.3 Short File Names",
    description: "Disables the legacy 8.3 short filename generation (e.g. PROGRA~1) on NTFS volumes. This legacy DOS compatibility feature creates an extra directory entry for every file, slowing down file creation and directory enumeration.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Very old 16-bit DOS programs that require 8.3 filenames will not work. No effect on modern applications."
  },
  {
    title: "Optimize Boot Configuration",
    description: "Enables boot-time file layout optimization and configures the prefetcher to optimize both boot and application launch. Windows rearranges boot files on disk for faster sequential reads during startup.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "No negative effects. Improves boot time by optimizing file placement on disk."
  },
  {
    title: "Increase System I/O Performance",
    description: "Increases the I/O page lock limit, allowing Windows to lock more pages in memory during disk I/O operations. Improves throughput for large file transfers and disk-intensive workloads by reducing page faults during I/O.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly higher memory reserved for I/O operations. Beneficial for systems with 8GB+ RAM."
  },

  // ── SYSTEM (Cortex Desktop Menu & Misc Optimization) ──────────────────────
  {
    title: "Speed Up System Shutdown",
    description: "Reduces the time Windows waits for applications and services to close during shutdown. Lowers WaitToKillServiceTimeout and WaitToKillAppTimeout from 5 seconds to 2 seconds, making shutdown and restart significantly faster.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Applications that need more than 2 seconds to save data during shutdown may be force-closed. Most apps save instantly."
  },
  {
    title: "Disable Taskbar & Menu Animations",
    description: "Disables taskbar button animations, Start menu animations, and the MinAnimate window minimize/maximize effect. Reduces visual overhead and makes the desktop feel snappier and more responsive.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows minimize/maximize will snap instantly without animation. Taskbar and Start menu transitions removed."
  },
  {
    title: "Disable Startup Disk Check",
    description: "Prevents Windows from automatically running chkdsk (Check Disk) on startup after an improper shutdown. While chkdsk repairs filesystem errors, the automatic scan can add minutes to boot time.",
    category: "system",
    isActive: false,
    warning: "If your system crashes frequently, leaving automatic disk check enabled helps detect and repair filesystem corruption. Only disable if your system shuts down cleanly.",
    featureBreaks: "Automatic filesystem check on boot disabled. Run chkdsk manually if you suspect disk errors."
  },
  {
    title: "Reduce Taskbar Preview Delay",
    description: "Reduces the hover delay before taskbar thumbnail previews appear from 400ms to near-instant. Makes the taskbar feel more responsive when hovering over running application icons.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Taskbar previews appear instantly on hover. No negative effects."
  },
  {
    title: "Disable AutoPlay for External Devices",
    description: "Disables the Windows AutoPlay feature that automatically runs or opens content when USB drives, CDs, or other external media are connected. Prevents potential malware from auto-executing when removable devices are plugged in.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "USB drives and CDs will not auto-open when connected. Must manually open in File Explorer."
  },
  {
    title: "Disable Notification Center",
    description: "Disables the Windows Action Center / Notification Center toast notifications. Stops popup notifications from appearing in the bottom-right corner of the screen. Reduces interruptions during gaming and focused work.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "No toast notifications from any app. Important alerts from Windows may be missed. Notifications can be viewed in Action Center history."
  },
  {
    title: "Reduce Keyboard Input Delay",
    description: "Sets the keyboard repeat delay to the shortest value and increases the repeat speed to maximum. Makes keyboard input feel more responsive, especially useful for gaming and fast typing.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Keys repeat faster when held down. No negative effects."
  },
  {
    title: "Increase Network Buffer Size",
    description: "Increases the SMB/CIFS request buffer size and IRPStackSize for better network file transfer performance. Improves throughput when accessing shared network drives and transferring large files over LAN.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly more memory used for network buffers. Improves network file transfer speed."
  },
  {
    title: "Optimize TCP/IP Network Stack",
    description: "Applies multiple TCP/IP optimizations: sets optimal TTL value (64), enables Path MTU Discovery for automatic packet size optimization, enables Selective ACK (SACK) for faster error recovery, and optimizes TCP data retransmission. Improves overall network throughput and reduces latency.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Network behavior is optimized for modern connections. Safe for all network types."
  },
  {
    title: "Optimize DNS Resolution",
    description: "Increases the DNS cache limits and maximum UDP packet size for faster DNS lookups. Reduces DNS query latency by caching more resolved addresses locally and allowing larger DNS responses.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly more memory used for DNS cache. Improves web browsing and online gaming responsiveness."
  },
  {
    title: "Unlock Reserved Network Bandwidth",
    description: "Removes the default 20% network bandwidth reservation that Windows reserves for QoS (Quality of Service) and system processes. Unlocks the full bandwidth of your network adapter for applications.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "QoS bandwidth reservation removed. All bandwidth available to applications. Minimal impact on system network traffic."
  },
  {
    title: "Increase Browser Connection Limits",
    description: "Increases the maximum concurrent HTTP connections per server from 2 to 16 for both HTTP/1.0 and HTTP/1.1. Allows browsers and download managers to open more simultaneous connections, improving download speeds and page load times.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "More simultaneous connections to web servers. Some servers may rate-limit excessive connections."
  },

  // ── NETWORK ───────────────────────────────────────────────────────────────
  {
    title: "Disable NetBIOS over TCP/IP",
    description: "Disables the legacy NetBIOS over TCP/IP protocol on all network adapters. NetBIOS is a 1980s-era LAN protocol still running on every Windows PC by default, generating unnecessary broadcast traffic and exposing your PC's name to the local network. Home and gaming PCs have zero use for it.",
    category: "network",
    isActive: false,
    warning: "CORPORATE/VPN USERS: If you connect to a work domain via VPN and access resources by hostname (e.g. \\\\server\\share), some corporate VPN configs rely on NetBIOS for name resolution. Disable only on personal/home-only PCs.",
    featureBreaks: "Some very old file/printer sharing tools that rely on NetBIOS names may stop working. No effect on modern SMB2/SMB3 file sharing or internet connectivity."
  },
  {
    title: "Disable SMBv1 Protocol",
    description: "Disables the legacy SMBv1 file-sharing protocol and removes the SMBv1 Windows Optional Feature. SMBv1 is a 1990s-era protocol with no security, exploited directly by WannaCry and NotPetya ransomware. All modern devices (NAS drives, printers, PCs) use SMBv2 or SMBv3. SMBv1 has been disabled by default since Windows 10 Fall Creators Update (2017) — this tweak ensures it stays off.",
    category: "network",
    isActive: false,
    warning: "RESTART REQUIRED after applying. OLD NAS USERS: Devices manufactured before 2006 with unupdated firmware may only support SMBv1. Note: reverting this tweak keeps SMBv1 disabled (Windows 10/11 default) — to manually re-enable it you must use an admin PowerShell command.",
    featureBreaks: "Requires a system restart to take effect. NAS devices or printers with only SMBv1 support (pre-2006, unupdated firmware) will be inaccessible. Reverting keeps SMBv1 disabled (the modern Windows default). All modern devices unaffected."
  },
  {
    title: "Disable Large Send Offload (LSO)",
    description: "Disables Large Send Offload on the network adapter. LSO batches multiple TCP segments together before sending, improving throughput at the cost of added latency. For online gaming and real-time applications where low latency beats raw throughput, disabling LSO reduces ping variance and makes connection feel more consistent.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Large file upload speed may be marginally reduced on some connections. Ping consistency improves — net benefit for gaming and real-time applications."
  },
  {
    title: "Enable Receive Side Scaling (RSS)",
    description: "Enables Receive Side Scaling which distributes incoming network packet processing across multiple CPU cores instead of funneling all traffic through a single core. On high-speed connections (100Mbps+) a single core can become a bottleneck. RSS eliminates this and reduces CPU latency spikes during heavy online gaming or streaming.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "No negative effects. Improves multi-core CPU utilization for network traffic. Effective on connections of 100Mbps and above."
  },
  {
    title: "Disable Delivery Optimization Service",
    description: "Disables the Windows Update Delivery Optimization service which silently uses your upload bandwidth to distribute Windows updates to other people's PCs over the internet, acting as a P2P node. Microsoft enables this by default without prominently informing users. Disabling stops all P2P upload activity.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Your PC will no longer upload Windows update files to other PCs on the internet. Your own Windows updates download directly from Microsoft and are completely unaffected."
  },
  {
    title: "Disable Windows Connect Now (wcncsvc)",
    description: "Disables the Windows Connect Now service which listens on the network for WPS-based device pairing requests. It's designed for initial Wi-Fi setup of printers and routers and has no purpose once your network is configured. Disabling removes an unnecessary network listener.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Cannot use Windows Connect Now wizard to automatically configure new wireless devices. Normal Wi-Fi, internet access, and printer usage are completely unaffected."
  },
  {
    title: "Disable LLMNR Protocol",
    description: "Disables Link-Local Multicast Name Resolution — a fallback name-resolution protocol that broadcasts DNS-style queries over the local network when DNS fails to resolve. LLMNR is trivially exploited by LLMNR poisoning attacks (Responder tool) which intercept credentials. Home PCs don't need it — DNS handles all name resolution.",
    category: "network",
    isActive: false,
    warning: "DOMAIN USERS: If your PC is joined to a Windows domain and resolves internal hostnames, verify DNS is properly configured before disabling LLMNR, as some domain environments fall back to LLMNR.",
    featureBreaks: "Local network name resolution falls back to DNS only. No effect on internet access, normal file sharing, or gaming."
  },
  {
    title: "Disable mDNS Multicast",
    description: "Disables Windows mDNS (Multicast DNS) which broadcasts .local domain lookup packets on your LAN to discover printers and devices. While useful for some setups, it generates constant background network chatter and announces your PC's presence on the network to all devices.",
    category: "network",
    isActive: false,
    warning: "Do NOT disable if you use mDNS-based device discovery on your local network — this includes Apple AirPrint printers, Chromecast, Apple TV, Bonjour-dependent software, and some smart home devices.",
    featureBreaks: "mDNS-based device auto-discovery disabled. AirPrint, Chromecast, and Bonjour-based printers may not be found automatically on the network."
  },

  {
    title: "Disable 6to4 & ISATAP Tunneling",
    description: "Disables 6to4 and ISATAP — two legacy IPv6 transition mechanisms that automatically tunnel IPv6 traffic over IPv4 networks. Like Teredo, these create unnecessary background network traffic and attempt connections to external relay infrastructure. On modern networks with native IPv4/IPv6 support, these tunneling methods serve no purpose.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Legacy IPv6 tunneling via 6to4 and ISATAP disabled. No effect on native IPv4 or IPv6 connections."
  },

  // ── SERVICES (Windows Service Optimization) ───────────────────────────────
  {
    title: "Disable BranchCache (PeerDistSvc)",
    description: "Disables the BranchCache service which caches content from remote file and web servers on a local network. Only used in enterprise/corporate environments with branch offices.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "BranchCache peer-to-peer content caching disabled. No effect on home networks."
  },
  {
    title: "Disable iSCSI Initiator (MSiSCSI)",
    description: "Disables the Microsoft iSCSI Initiator Service used for connecting to iSCSI storage targets. Only needed in enterprise environments with iSCSI SAN (Storage Area Network) infrastructure.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Cannot connect to iSCSI storage targets. No effect unless you use network-attached iSCSI drives."
  },
  {
    title: "Disable SNMP Trap (SNMPTRAP)",
    description: "Disables the SNMP Trap service which receives trap messages from network devices and forwards them to SNMP management software. Only used in enterprise network monitoring environments.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "SNMP trap message handling disabled. No effect on home networks."
  },
  {
    title: "Disable Certificate Propagation (CertPropSvc)",
    description: "Disables the Certificate Propagation service which copies user certificates and root certificates from smart cards into the current user's certificate store. Only needed if you use smart card authentication.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use smart card authentication for work or VPN access.",
    featureBreaks: "Smart card certificate propagation disabled. No effect if you don't use smart cards."
  },
  {
    title: "Disable ActiveX Installer (AxInstSV)",
    description: "Disables the ActiveX Installer service which handles installation of ActiveX controls from the web. ActiveX is a legacy technology that has been replaced by modern web standards.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "ActiveX controls cannot be installed from the web. No effect on modern websites."
  },
  {
    title: "Disable Application Management (AppMgmt)",
    description: "Disables the Application Management service used for processing Group Policy software installation requests. Only used in corporate Active Directory environments for centralized software deployment.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Group Policy software deployment disabled. No effect on home or non-domain PCs."
  },
  {
    title: "Disable Remote Registry (RemoteRegistry)",
    description: "Disables the Remote Registry service which allows remote users to modify Windows registry settings on this computer over the network. Disabling this improves security by preventing remote registry access.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Remote registry editing over the network disabled. Improves security with no downside for personal use."
  },
  {
    title: "Disable Smart Card Removal Policy (SCPolicySvc)",
    description: "Disables the Smart Card Removal Policy service which locks the desktop when a smart card is removed. Only needed in enterprise environments that use smart card login.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Smart card removal desktop lock disabled. No effect if you don't use smart cards."
  },
  {
    title: "Disable WebDAV Client (WebClient)",
    description: "Disables the WebClient service which allows Windows to access and edit files on WebDAV servers (web-based file storage). Rarely used by consumer applications.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use SharePoint or OneDrive via File Explorer mapped drives that use WebDAV.",
    featureBreaks: "WebDAV file access disabled. SharePoint/OneDrive mapped drives may not work if they use WebDAV."
  },
  {
    title: "Disable Windows Remote Management (WinRM)",
    description: "Disables the Windows Remote Management (WS-Management) service used for remote PowerShell sessions and server management. Only needed in enterprise IT administration environments.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Remote PowerShell sessions and WinRM-based management tools disabled. No effect on personal use."
  },
  {
    title: "Disable Offline Files (CscService)",
    description: "Disables the Offline Files service which caches network files locally for offline access. Only useful in enterprise environments where users need to work with network drives while disconnected.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Offline file caching for network drives disabled. No effect on local files or cloud storage."
  },
  {
    title: "Disable Peer Name Resolution (PNRPsvc)",
    description: "Disables the Peer Name Resolution Protocol service used for serverless peer-to-peer name resolution. Part of Windows peer networking infrastructure that is rarely used by consumer applications.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Peer-to-peer name resolution disabled. No effect on normal networking, web browsing, or gaming."
  },
  {
    title: "Disable Peer Networking (p2psvc)",
    description: "Disables the Peer Networking Grouping service which enables multi-party communication using peer-to-peer grouping. Part of the Windows P2P infrastructure rarely used by modern applications.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Windows peer-to-peer grouping disabled. No effect on normal networking or internet usage."
  },
  {
    title: "Disable Peer Networking Identity (p2pimsvc)",
    description: "Disables the Peer Networking Identity Manager service which provides identity services for the Windows Peer-to-Peer networking stack. Companion to the Peer Networking services.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Peer networking identity management disabled. No effect on normal networking."
  },
  {
    title: "Disable Print Spooler (Spooler)",
    description: "Stops and disables the Windows Print Spooler service. The Print Spooler runs permanently in the background even on systems with no printer attached. It has been the target of multiple critical Windows exploits (PrintNightmare, CVE-2021-34527). Disabling it frees RAM and closes a significant attack surface.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use a printer. The Print Spooler is required for all local and network printing. Only apply on systems that never print.",
    featureBreaks: "All printing disabled — local and network printers. Re-enable via Services.msc (Spooler) if a printer is needed."
  },
  {
    title: "Disable Fax Service (Fax)",
    description: "Disables the Windows Fax and Scan service. No modern consumer or gaming PC uses fax functionality. This service consumes resources for zero benefit on virtually all home systems.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Windows Fax and Scan application will not function. No effect on any modern workflow."
  },
  {
    title: "Disable Distributed Link Tracking (TrkWks)",
    description: "Disables the Distributed Link Tracking Client which maintains file shortcut links across a network domain. It generates periodic network traffic to communicate with the tracking server. On home and gaming PCs with no Active Directory domain, this service provides zero benefit.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Shortcut links to files on remote network locations may break if the file is moved. No effect on local shortcuts."
  },
  {
    title: "Disable Program Compatibility Assistant (PcaSvc)",
    description: "Disables the Program Compatibility Assistant which monitors programs for compatibility problems and suggests compatibility settings. On a stable gaming PC with known software, this monitoring adds background CPU overhead with no benefit.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Windows will not automatically detect or suggest compatibility fixes for older programs. Manual compatibility settings still work via right-click properties."
  },
  {
    title: "Disable Touch Keyboard Service (TabletInputService)",
    description: "Disables the Touch Keyboard and Handwriting Panel service used for on-screen keyboard input on tablets and touchscreen devices. Desktop PC users with a physical keyboard gain nothing from this service running in the background.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use a touchscreen, tablet mode, or handwriting input on your device.",
    featureBreaks: "On-screen touch keyboard, handwriting recognition panel disabled. No effect on physical keyboard input."
  },
  {
    title: "Disable Windows Insider Service (wisvc)",
    description: "Disables the Windows Insider Service responsible for delivering and managing Windows Preview builds. If you are not enrolled in the Windows Insider Program, this service runs unnecessarily. Disabling it frees background resources.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you are enrolled in the Windows Insider Program (receiving Preview builds).",
    featureBreaks: "Windows Insider Preview builds will not be delivered. No effect if you are on a stable Windows release."
  },
  {
    title: "Disable IP Helper Service (iphlpsvc)",
    description: "Disables the IP Helper service which provides automatic IPv6 connectivity (Teredo, 6to4, ISATAP tunnel management) and assists with network configuration. On networks that do not use these legacy IPv6 tunneling technologies, the service runs permanently in the background for no benefit.",
    category: "services",
    isActive: false,
    warning: "If you rely on automatic IPv6 tunnel connectivity (Teredo/6to4) for Xbox Live or specific VPN setups, this may affect those connections.",
    featureBreaks: "IPv6 tunneling assistance and automatic transition technology management disabled. Native IPv4 and IPv6 connections are unaffected."
  },
  {
    title: "Disable Diagnostic Policy Service (DPS)",
    description: "Disables the Diagnostic Policy Service which detects and troubleshoots network, disk, and other component problems, and presents Windows troubleshooter suggestions. The service runs constant background checks using CPU resources. On a stable, well-configured gaming PC these automated diagnostics add overhead with no practical benefit.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Windows automatic troubleshooters will not run. Network diagnostics and the 'Diagnose this problem' feature in right-click menus disabled."
  },
  {
    title: "Disable Connected Devices Platform (CDPSvc)",
    description: "Disables the Connected Devices Platform service which powers cross-device features: Nearby Sharing, Continue on PC, cross-device clipboard, and Bluetooth device pairing workflows. On a gaming PC where you don't need to share files to nearby devices or continue tasks from your phone, this service runs for no purpose.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use Windows Nearby Sharing, Continue on PC, or cross-device clipboard with your phone or other devices.",
    featureBreaks: "Nearby Sharing, Continue on PC, cross-device clipboard, and some Bluetooth pairing workflows disabled. No effect on normal internet, gaming, or file transfers."
  },

  // ── GAMING (Razer Cortex Speed Up style) ─────────────────────────────────
  {
    title: "Disable USB Selective Suspend",
    description: "Prevents Windows from power-suspending USB devices after periods of inactivity. USB Selective Suspend can cause input devices — mice, keyboards, and gamepads — to momentarily disconnect or introduce input lag spikes when the device wakes from a suspended state during gaming.",
    category: "gaming",
    isActive: false,
    warning: "LAPTOP USERS: Disabling this will slightly increase battery drain as USB devices remain powered continuously. Desktop users have no drawback.",
    featureBreaks: "USB devices remain fully powered at all times. Eliminates USB input lag spikes during gaming. Slightly higher power draw on battery."
  },
  {
    title: "Set TSC Sync Policy (Precise Game Timing)",
    description: "Configures the processor's Time Stamp Counter synchronization policy to Enhanced mode via bcdedit. This ensures all CPU cores share a precisely synchronized clock source, reducing timer inconsistencies that cause micro-stutter and frame time variance in games and high-refresh-rate applications.",
    category: "gaming",
    isActive: false,
    warning: "Requires a system restart to take effect. Supported on all modern Intel and AMD Ryzen processors.",
    featureBreaks: "Restart required. Improves timer accuracy for games and high-refresh displays. No other effects."
  },
  {
    title: "Disable GameInput Service (gaminputsvc)",
    description: "Disables the GameInput service introduced in Windows 11, which provides a unified input API layer. This service runs in the background on every Windows 11 install. Most games use DirectInput or XInput directly and do not need this service at all.",
    category: "gaming",
    isActive: false,
    warning: "Some newer Windows 11 games that specifically use the GameInput API may experience controller input issues. Most games (Fortnite, Call of Duty, CS2, and all legacy titles) use DirectInput or XInput and are unaffected.",
    featureBreaks: "GameInput API unavailable. Affects only games coded specifically to use the Windows 11 GameInput API. Standard XInput/DirectInput controller support is unaffected."
  },

  // ── NETWORK (Razer Cortex Speed Up style) ────────────────────────────────
  {
    title: "Enable TCP Fast Open",
    description: "Enables TCP Fast Open (TFO) which allows TCP connections to include data in the initial handshake packet, eliminating a full round-trip time for frequently-visited servers. Reduces connection setup latency for web browsing, gaming server connections, and any TCP-based communication.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Safe to enable — falls back to standard TCP handshake if the server does not support TFO. No negative effects."
  },
  {
    title: "Disable NIC Interrupt Moderation",
    description: "Disables Interrupt Moderation (also called Interrupt Coalescing) on physical network adapters. Interrupt Moderation batches multiple network interrupt signals before triggering the CPU, adding latency to every packet. Disabling it ensures each packet triggers an immediate CPU interrupt — critical for competitive gaming and low-latency applications.",
    category: "network",
    isActive: false,
    warning: null,
    featureBreaks: "Slightly higher CPU utilization from the network adapter under heavy load. Reduces latency but increases CPU interrupts. Ideal for gaming; less impactful for large file transfers."
  },

  // ── SERVICES (Windows Service Optimization) ───────────────────────────────
  {
    title: "Disable Secondary Logon (seclogon)",
    description: "Disables the Secondary Logon service which enables the Run as different user functionality. Most home and gaming PC users never use this feature — the service sits idle consuming memory and is an unnecessary attack surface.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "The Run as different user right-click option will not work. No effect for personal or gaming use."
  },
  {
    title: "Disable WMI Performance Adapter (wmiApSrv)",
    description: "Disables the WMI Performance Adapter which provides performance counter information through Windows Management Instrumentation. Only required by third-party performance monitoring and enterprise management software — not needed for gaming or standard use.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Third-party performance monitoring tools that query WMI counters may not read data. No effect on gaming or standard applications."
  },
  {
    title: "Disable TCP/IP NetBIOS Helper (lmhosts)",
    description: "Disables the TCP/IP NetBIOS Helper service which enables legacy NetBIOS over TCP/IP hostname resolution — a pre-DNS Windows networking remnant from the 1990s. On modern networks using DNS for name resolution, this service provides zero benefit and runs permanently in the background.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Legacy NetBIOS hostname resolution disabled. Modern network shares accessed by IP or DNS name are fully unaffected."
  },
  {
    title: "Disable Telephony Service (TapiSrv)",
    description: "Disables the Telephony (TAPI) service which manages physical telephone lines, modems, and dial-up connections. On any PC without a physical modem or legacy dial-up hardware, this service runs at startup permanently for no reason.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "Modem, dial-up, and TAPI-based VoIP applications will not work. No effect on broadband internet or modern VoIP apps like Discord, Teams, or Zoom."
  },
  {
    title: "Disable Still Image Service (StiSvc)",
    description: "Disables the Windows Still Image service which manages USB-connected scanners and digital cameras via the Windows Image Acquisition (WIA) protocol. If you do not use a standalone scanner or a digital camera that connects via USB for image transfer, this service is completely unnecessary.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use a USB scanner or a digital camera connected to your PC for importing photos via Windows camera import.",
    featureBreaks: "USB scanners and WIA-compatible cameras will not be recognized for photo import. Webcams used for video calls are unaffected."
  },
  {
    title: "Disable Bluetooth Support Service (bthserv)",
    description: "Disables the Bluetooth Support Service entirely. If your PC has no Bluetooth hardware, or you exclusively use wired peripherals and never connect Bluetooth devices, this service runs in the background consuming resources for no benefit.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use a Bluetooth mouse, keyboard, headset, controller, or any other Bluetooth peripheral. Only apply on PCs where no Bluetooth devices are ever used.",
    featureBreaks: "All Bluetooth devices will stop working — mice, keyboards, headsets, controllers, speakers. Disable only if you use zero Bluetooth peripherals."
  },
  {
    title: "Disable Net.TCP Port Sharing (NetTcpPortSharing)",
    description: "Disables the .NET TCP Port Sharing service which allows multiple applications to share the same TCP port via the .NET WCF (Windows Communication Foundation) framework. This is a purely enterprise feature — no consumer software, game, or standard desktop application requires it.",
    category: "services",
    isActive: false,
    warning: null,
    featureBreaks: "WCF enterprise applications using .NET TCP port sharing will not function. No effect on games, streaming, browsers, or standard desktop apps."
  },
  {
    title: "Disable Remote Access Manager (RasMan)",
    description: "Disables the Remote Access Connection Manager which handles Windows' built-in VPN connections, dial-up connections, and the L2TP/PPTP/SSTP VPN protocols. If you never use Windows' built-in VPN client, this service runs at startup permanently for no reason.",
    category: "services",
    isActive: false,
    warning: "Do NOT disable if you use Windows built-in VPN client (Settings → Network → VPN) or any corporate L2TP/PPTP/IKEv2 VPN. Third-party VPN apps (NordVPN, ExpressVPN) that use their own tunnel driver typically work independently — test before applying.",
    featureBreaks: "Windows built-in VPN client and dial-up connections disabled. Some third-party VPN clients that rely on the RAS infrastructure may also stop working."
  },

  // ── PERFORMANCE (additional) ─────────────────────────────────────────────
  {
    title: "Clear Page File on Shutdown",
    description: "Configures Windows to zero out the page file (virtual memory swap file) every time the PC shuts down. This prevents sensitive data that was in RAM (passwords, encryption keys, document contents) from persisting in the page file on disk after shutdown. Also ensures a clean page file state on every boot.",
    category: "performance",
    isActive: false,
    warning: "Adds a few seconds to shutdown time as Windows clears the page file. Only noticeable on systems with large page files.",
    featureBreaks: "Shutdown takes slightly longer. Page file is wiped clean on every shutdown — improves security and ensures fresh virtual memory on boot."
  },
  {
    title: "Disable Transparency Effects",
    description: "Turns off Windows transparency/blur effects on the taskbar, Start menu, and notification center. Transparency effects require the Desktop Window Manager to continuously blend and composite layers, consuming GPU and CPU resources every frame. Disabling them frees this overhead and can reduce micro-stutters caused by DWM composition.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Taskbar, Start menu, and Action Center become fully opaque instead of translucent/blurred. Visual appearance change only — no functional effect."
  },
];
