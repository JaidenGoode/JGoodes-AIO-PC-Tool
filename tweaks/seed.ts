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
    title: "Disable Windows File Indexing",
    description: "Stops the Windows Search Indexer from continuously indexing files in the background. HDD users will see the biggest benefit — indexing causes constant disk activity on spinning drives. On SSDs the improvement is smaller, but it still eliminates unnecessary background writes that reduce SSD lifespan over time.",
    category: "performance",
    isActive: false,
    warning: "HDD USERS: Strongly recommended — background indexing is one of the main causes of HDD slowness. SSD USERS: Lower but still worthwhile benefit for reducing background disk writes.",
    featureBreaks: "Windows Search will be slower as it searches without an index. Typing in File Explorer search bar will be slower."
  },
  {
    title: "Disable Background UWP Apps",
    description: "Prevents Windows Store (UWP) apps such as Spotify, Photos, Mail, Maps, and News from running and consuming CPU and RAM in the background when you are not using them.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "UWP apps will not refresh content or receive live tile updates in the background. Opening an app will always show up-to-date content once launched."
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
    description: "Disables all Windows visual effects for maximum performance — window animations, drop shadows, taskbar animations, thumbnail previews, menu fading, and transparent selection rectangles — while keeping ClearType font rendering enabled so text stays crisp.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Windows looks more basic — no animations, shadows, or fading effects. Font rendering remains smooth. All effects can be restored in Control Panel → System → Advanced → Performance Settings."
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
    description: "Turns off Windows Pointer Precision (mouse acceleration), giving a true 1:1 relationship between physical mouse movement and on-screen cursor movement. Essential for FPS gaming — without acceleration your cursor moves exactly as far as you physically move the mouse, no more, no less.",
    category: "gaming",
    isActive: false,
    warning: "Your mouse will feel different at first. The cursor moves less when you push quickly and more precisely matches your physical movement. This is the correct setting for gaming but takes a short adjustment period to recalibrate. Lower your in-game sensitivity slightly after enabling to compensate.",
    featureBreaks: "Mouse aiming will feel different initially — requires a short adjustment period. Revert at any time to restore Windows default."
  },
  {
    title: "Keep All CPU Cores Active (Unpark Cores)",
    description: "Forces all CPU cores to remain active and prevents Windows from parking (powering down) idle cores. Reduces latency spikes caused by cores waking up mid-game.",
    category: "gaming",
    isActive: false,
    warning: "NOT RECOMMENDED for AMD Ryzen X3D processors (5800X3D, 7800X3D, 7950X3D, 9800X3D etc.) — the X3D cache thermal design relies on Windows core parking for temperature management. Forcing cores active can cause thermal issues.",
    featureBreaks: "Higher idle power consumption. All cores stay fully active permanently."
  },
  {
    title: "Disable GameBar",
    description: "Completely disables the Xbox GameBar overlay. Removes background GameBar processes and prevents it from hooking into games, freeing up minor system resources.",
    category: "gaming",
    isActive: false,
    warning: "If you use the GameBar (Win+G) to monitor FPS, CPU, or GPU usage while gaming, or to take screenshots and clips, disable this tweak — those features will stop working. Use Revert to restore GameBar at any time.",
    featureBreaks: "Cannot use GameBar overlay (Win+G). Screenshot and clip shortcuts via GameBar disabled. FPS/CPU/GPU overlay from GameBar unavailable."
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
    description: "Removes two Windows performance limiters from the Multimedia System Profile: (1) the network packet throttle that Windows applies to multimedia applications is fully disabled so game packets are never delayed, and (2) the background CPU reservation that Windows holds for system tasks is set to zero — giving games full access to every available CPU cycle.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background system tasks receive no reserved CPU time. Network packets are never throttled. Background downloads or tasks may feel marginally slower while gaming — this is intentional."
  },
  {
    title: "Win32 Priority Separation",
    description: "Configures how the Windows CPU scheduler distributes processing time between the active foreground application and background tasks. The gaming-optimised value (0x24) gives your game a fixed, maximum CPU time boost with the shortest possible scheduling intervals — reducing micro-stutter and improving frame consistency. Revert restores the Windows default (0x26).",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background processes receive less CPU scheduler time while a game is running. No effect outside of gaming sessions."
  },
  {
    title: "Maximum Priority for Games",
    description: "Configures the Windows Multimedia SystemProfile Tasks\\Games entry to give games the highest possible scheduler priority: GPU Priority 8 (max), CPU Priority 6 (High), Scheduling Category High, SFIO Priority High, Background Only False, and Latency Sensitive True. Every process registered as a game gets maximum CPU, GPU, and disk access priority.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Background applications receive fewer scheduler slots while a game is running. No side effects outside of gaming."
  },
  {
    title: "Disable Auto-Restart After Windows Updates",
    description: "Prevents Windows from automatically rebooting your PC after installing updates — even when you're in the middle of a game or important work. Windows normally schedules forced restarts and can interrupt active sessions. This tweak keeps your PC running until you choose to restart.",
    category: "system",
    isActive: false,
    warning: "IMPORTANT: After Windows installs updates, you must restart manually to apply them. If you ignore pending restarts for a long time, your PC may be missing critical security patches. Check Windows Update periodically and restart when updates are pending.",
    featureBreaks: "Windows will not auto-restart after updates. You must restart manually to apply updates. Check Windows Update → Restart now when updates are pending."
  },
  {
    title: "Disable Xbox Core Services",
    description: "Stops and disables four background Xbox services that run even if you don't use Xbox features: XboxGipSvc, XblAuthManager, XblGameSave, and XboxNetApiSvc. These silently consume RAM and CPU cycles in the background on every Windows install.",
    category: "gaming",
    isActive: false,
    warning: "Do NOT apply if you use Xbox Play Anywhere games, Xbox Live cloud saves, or the Xbox Accessories app to configure your Xbox controller. Reverting re-enables all four services.",
    featureBreaks: "Xbox Live features, Xbox controller remapping via Xbox Accessories app, and Xbox Live game saves will not function until reverted. Can be re-enabled at any time in Services.msc or via the Revert button."
  },

  // ── SYSTEM ───────────────────────────────────────────────────────────────────
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
    description: "Disables Windows TCP receive window auto-tuning which dynamically adjusts the TCP receive window size. Auto-tuning can sometimes over-compensate on certain networks and cause latency spikes. Disabling it sets a fixed receive window, which can improve consistency and reduce jitter in online games.",
    category: "system",
    isActive: false,
    warning: "May reduce large file download speeds on high-latency connections (e.g. satellite internet or very long-distance servers). Test your download speeds after applying — if throughput drops significantly, revert. Broadband cable and fibre connections are generally unaffected.",
    featureBreaks: "Large file download throughput may be reduced on high-latency connections. Gaming latency consistency typically improves."
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
    warning: "Automatic Windows Defender scans will no longer run on their own — you must open Windows Security and run manual scans periodically. This is safe if you are disciplined about running occasional scans and maintenance manually.",
    featureBreaks: "Automatic maintenance disabled. Windows Defender scheduled scans stop. Disk Cleanup and defragmentation must be run manually."
  },
  {
    title: "Disable Power Throttling",
    description: "Disables the Windows Power Throttling feature which reduces CPU power to background processes to save battery. On desktop PCs this only wastes CPU potential. Ensures all apps get consistent CPU access without Windows selectively throttling them.",
    category: "system",
    isActive: false,
    warning: "LAPTOP USERS: Disabling Power Throttling will increase power consumption and heat. Only apply if you are plugged in and want maximum performance. Desktop users have no drawback.",
    featureBreaks: "Background apps may use more CPU power. Battery life reduced on laptops. Desktop users: no negative effect."
  },
  {
    title: "Disable Phone Link & Mobile Sync",
    description: "Disables the Phone Link (formerly Your Phone) feature that syncs your Android or iPhone to Windows. Also disables the Connected Device Platform (CDP) that allows cross-device experiences. Reduces background activity and stops Windows from trying to connect to your mobile devices.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Phone Link app cannot sync with your phone. Cross-device clipboard and Continue on PC features disabled."
  },

  // ── PERFORMANCE (Disk / Memory) ────────────────────────────────────────────
  {
    title: "Auto-End Unresponsive Programs",
    description: "Automatically terminates programs that stop responding instead of waiting indefinitely. Reduces the hung-app timeout from 5 seconds to 1 second and sets Windows to auto-end tasks on shutdown, preventing the 'This app is preventing shutdown' dialog.",
    category: "performance",
    isActive: false,
    warning: "Programs that temporarily freeze for more than 1 second will be force-closed automatically. If you use apps that sometimes take a moment to respond (like older software or heavy programs), they may be closed before they recover. Always save your work frequently.",
    featureBreaks: "Programs that freeze for more than 1 second are force-closed. Unsaved work in a frozen app may be lost. Shutdown is faster as stuck programs are terminated immediately."
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
    description: "Enables fast startup (hybrid boot), reduces the boot menu timeout to 3 seconds, and configures Windows to use the CPU's own TSC clock instead of the platform clock — resulting in faster boot times and more consistent system timer resolution.",
    category: "performance",
    isActive: false,
    warning: "Restart required. Note: Enabling fast startup may conflict with the Hibernation tweak — apply one or the other, not both.",
    featureBreaks: "Restart required. Fast startup enabled (hybrid shutdown). Boot menu shows for 3 seconds instead of 30. Platform clock replaced with TSC for timer resolution."
  },
  // ── SYSTEM (Desktop / Misc) ────────────────────────────────────────────────
  {
    title: "Disable Taskbar & Menu Animations",
    description: "Disables taskbar button animations, Start menu animations, and the MinAnimate window minimize/maximize effect. Reduces visual overhead and makes the desktop feel snappier and more responsive.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows minimize/maximize will snap instantly without animation. Taskbar and Start menu transitions removed."
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
    warning: "ALL notifications from every app will be silenced — including security alerts, Windows Defender warnings, software updates, and message app popups. You will not be alerted to anything on screen while this is active. Revert this tweak if you need to stay informed of system alerts.",
    featureBreaks: "No popup notifications from any app or Windows itself. Important system warnings will be invisible. Notifications remain in the Action Center icon if clicked."
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
    title: "Unlock Reserved Network Bandwidth",
    description: "Removes the default 20% network bandwidth reservation that Windows reserves for QoS (Quality of Service) and system processes. Unlocks the full bandwidth of your network adapter for applications.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "QoS bandwidth reservation removed. All bandwidth available to applications. Minimal impact on system network traffic."
  },

  // ── GAMING (USB / Timing) ─────────────────────────────────────────────────
  {
    title: "Disable USB Selective Suspend",
    description: "Prevents Windows from power-suspending USB devices after periods of inactivity. USB Selective Suspend can cause input devices — mice, keyboards, and gamepads — to momentarily disconnect or introduce input lag spikes when the device wakes from a suspended state during gaming.",
    category: "gaming",
    isActive: false,
    warning: "LAPTOP USERS: Disabling this will slightly increase battery drain as USB devices remain powered continuously. Desktop users have no drawback.",
    featureBreaks: "USB devices remain fully powered at all times. Eliminates USB input lag spikes during gaming. Slightly higher power draw on battery."
  },

  // ── PERFORMANCE (additional) ─────────────────────────────────────────────
  {
    title: "Disable Transparency Effects",
    description: "Turns off Windows transparency/blur effects on the taskbar, Start menu, and notification center. Transparency effects require the Desktop Window Manager to continuously blend and composite layers, consuming GPU and CPU resources every frame. Disabling them frees this overhead and can reduce micro-stutters caused by DWM composition.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Taskbar, Start menu, and Action Center become fully opaque instead of translucent/blurred. Visual appearance change only — no functional effect."
  },
  {
    title: "Disable Tile Notification System",
    description: "Disables the Windows Live Tile notification system which continuously polls the internet, wakes the CPU, writes notification data to disk, and keeps background UWP app processes alive to update Start menu tile content. Disabling tile notifications reduces idle disk writes, lowers background memory usage, and improves system responsiveness.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Start menu tiles will no longer display live content (news headlines, weather, mail counts, etc.). Tile icons remain but become static. All other notification types (toast popups, system tray alerts) are unaffected."
  },
  {
    title: "Disable Windows Error Reporting",
    description: "Disables the Windows Error Reporting service (WerSvc) which automatically generates crash dump files and uploads them to Microsoft whenever any program crashes. During gaming, if a background application crashes, WerSvc triggers a sudden spike in CPU and disk usage while writing minidump files — causing frame drops and stutters at the worst possible moment.",
    category: "performance",
    isActive: false,
    warning: "If you regularly experience application crashes and want to report them or investigate why they happen, leave this enabled — disabling it means no crash information is saved or sent. For stable systems this is a safe disable.",
    featureBreaks: "Crash reports will not be generated or submitted to Microsoft. If an app crashes, no minidump file is saved for debugging. No impact on game or application functionality."
  },
  {
    title: "Disable Connected Telemetry (DiagTrack)",
    description: "Disables the Connected User Experiences and Telemetry service (DiagTrack) — Microsoft's always-on background data collection engine that continuously monitors your system activity, writes telemetry data to disk, and uploads it over your internet connection at regular intervals. Even during gaming this service runs in the background consuming CPU cycles, generating disk I/O, and using upload bandwidth.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Windows will not collect or upload usage diagnostic data to Microsoft. No functional impact on games, applications, or Windows features."
  },
  {
    title: "Disable Application Compatibility Telemetry",
    description: "Disables Windows Application Insights Telemetry (AITEnable) and the Program Compatibility Assistant service (PcaSvc) which intercept every single process launch on your system to log app compatibility data. Every time you start a game or application, Windows silently records it and checks it against a cloud compatibility database — adding overhead to every program start.",
    category: "performance",
    isActive: false,
    warning: null,
    featureBreaks: "Windows will no longer suggest automatic compatibility fixes for old software. No effect on modern games, Steam, Epic, or any current applications."
  },
  {
    title: "Disable Windows Activity History",
    description: "Stops Windows from secretly logging every application, document, and file you open for the Windows Timeline (Task View history) feature. Activity History creates constant background disk writes throughout every work and gaming session as Windows records your activity. It also periodically uploads this history to Microsoft's servers.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows Timeline will no longer record activity — the Task View timeline history will be empty. No effect on file access, applications, or gaming functionality."
  },
  {
    title: "Disable Windows Advertising ID",
    description: "Disables the per-user advertising identifier that Windows assigns to track app usage across all installed applications for Microsoft's targeted advertising system. Background processes associated with ad profiling run silently during every session. Disabling the Advertising ID via both user registry and Group Policy stops all ad-tracking background activity.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Apps that display ads will show non-personalized ads instead of targeted ones. No functional impact on gaming, productivity apps, or system operation."
  },
  {
    title: "Disable Windows Content Delivery Manager",
    description: "Stops the Windows Content Delivery Manager from silently installing sponsored apps, pushing lock screen advertisements, adding suggested apps to your Start menu, and pre-installing OEM bloatware in the background without any notification. Microsoft uses this mechanism post-installation to add unwanted software to your PC.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows will no longer silently install suggested or sponsored apps. Lock screen tips, Start menu app suggestions, and OEM pre-installs will stop. No effect on installed apps, games, or the Windows Store."
  },
  {
    title: "Disable Clipboard History Collection",
    description: "Stops Windows from collecting and storing clipboard history (the Win+V clipboard manager) and prevents clipboard content from syncing across your devices via Microsoft's cloud clipboard service. Clipboard data can contain passwords, personal information, and sensitive content — disabling collection prevents it from being written to disk or uploaded to Microsoft's servers.",
    category: "system",
    isActive: false,
    warning: "The Win+V clipboard history (multi-item paste history) will stop working and be cleared. If you regularly press Win+V to paste previously copied text or images, you will lose that ability while this is active. Normal Ctrl+C and Ctrl+V still work perfectly.",
    featureBreaks: "Win+V clipboard history stops working and is cleared. Cloud clipboard sync across Windows devices is disabled. Standard Ctrl+C / Ctrl+V clipboard works normally and is completely unaffected."
  },
  {
    title: "Disable Virtualization-Based Security (VBS)",
    description: "Disables Windows Virtualization-Based Security which runs a Hyper-V hypervisor underneath Windows to isolate certain security processes (HVCI, Credential Guard). While VBS improves security, it introduces 5–15% CPU overhead to ALL processes system-wide including games, because Windows itself is running inside a virtualization layer. Disabling VBS removes this overhead and gives games more direct access to hardware. Requires a system restart to take effect.",
    category: "gaming",
    isActive: false,
    warning: "REQUIRES RESTART to take effect. Disables Hypervisor-Protected Code Integrity (HVCI) and Credential Guard. Not recommended for domain-joined or work PCs. For personal gaming PCs the performance gain typically outweighs the security trade-off.",
    featureBreaks: "HVCI and Credential Guard security isolation features are disabled after restart. WSL2 and standard Hyper-V virtual machines continue to work normally. A full system restart is required before any performance change is felt."
  },
  {
    title: "Foreground Application Priority Lock Timeout",
    description: "Sets ForegroundLockTimeout to 0ms so the foreground application priority boost activates instantly when you switch to a window. The default 200ms delay means your game can experience a brief priority drop whenever you alt-tab in or out. Setting to 0 eliminates this delay entirely.",
    category: "gaming",
    isActive: false,
    warning: null,
    featureBreaks: "Foreground priority boost kicks in immediately on window focus. No side effects."
  },
  {
    title: "Disable Print Spooler",
    description: "Stops and disables the Windows Print Spooler service. If you don't have a printer, the Spooler runs unnecessarily in the background consuming RAM, CPU, and disk I/O while also being a historically common Windows security vulnerability (PrintNightmare etc.).",
    category: "system",
    isActive: false,
    warning: "If you have a printer, DO NOT disable this — all printing will stop working immediately. Only apply if you have no printer connected and do not print from this PC.",
    featureBreaks: "All printing functionality disabled. No documents can be printed from this PC while this is active. Revert instantly restores the Spooler and all printing."
  },
  {
    title: "Disable Windows Copilot AI Sidebar",
    description: "Disables the Windows Copilot AI Sidebar via Group Policy on Windows 11 23H2 and newer. Stops the BingCoPilot background browser process and removes the Copilot taskbar button, freeing the associated system resources.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Windows Copilot AI sidebar disabled and taskbar button removed on Windows 11 23H2+. No effect on Windows 10 or older Windows 11 builds."
  },
  {
    title: "Disable Phone Link App",
    description: "Removes the Phone Link (Your Phone) app which runs background processes to sync your mobile device to Windows. If you don't use phone syncing, this app silently consumes memory and keeps unnecessary background services active.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Phone Link / Your Phone app is removed. Cannot sync Android or iPhone to Windows until reverted. Cross-device clipboard and Continue on PC features will stop working."
  },
  {
    title: "Disable Windows 11 Widgets Panel",
    description: "Disables the Windows 11 Widgets Panel (News and Interests) which runs a background fetch process that continuously polls for news, weather, and stock data — consuming CPU, RAM, and network bandwidth even when you never open Widgets. Disabling removes the Widgets taskbar button and stops all background activity.",
    category: "system",
    isActive: false,
    warning: null,
    featureBreaks: "Widgets taskbar button removed. No news, weather, or stock data in Widgets. No effect on Windows 10 — this key is ignored on Win10."
  },
];
