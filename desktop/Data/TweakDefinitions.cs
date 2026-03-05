using JGoodeAIO.Models;
using System.Collections.Generic;

namespace JGoodeAIO.Data;

public static class TweakDefinitions
{
    public static List<Tweak> All => new()
    {
        new() { Id=1, Title="Debloat Windows", Category="debloat",
            Description="Removes OneDrive, disables consumer features, telemetry, Explorer automatic folder discovery, PowerShell 7 telemetry, WPBT, widgets, enables End Task via right-click, shows hidden files, removes Home & Gallery from Explorer.",
            Warning=null, FeatureBreaks="OneDrive removed. Widgets disabled. Some Microsoft features/services disabled.",
            PowerShellCommand=@"Get-AppxPackage *OneDrive* | Remove-AppxPackage; reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent' /v 'DisableWindowsConsumerFeatures' /t REG_DWORD /d 1 /f; reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' /v 'Hidden' /t REG_DWORD /d 1 /f; reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' /v 'HideFileExt' /t REG_DWORD /d 0 /f"},

        new() { Id=2, Title="Disable Telemetry & Data Collection", Category="privacy",
            Description="Stops Windows from sending usage, diagnostic, and crash data to Microsoft. Disables Connected User Experiences service, telemetry tasks, and sets diagnostic data to minimum.",
            Warning=null, FeatureBreaks="Microsoft may not receive crash reports. Windows feedback prompts disabled.",
            PowerShellCommand=@"sc stop DiagTrack; sc config DiagTrack start= disabled; reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection' /v 'AllowTelemetry' /t REG_DWORD /d 0 /f; schtasks /change /tn 'Microsoft\Windows\Application Experience\ProgramDataUpdater' /disable"},

        new() { Id=3, Title="Disable Advertising ID", Category="privacy",
            Description="Resets and disables the Advertising ID used for personalized ads across apps.",
            Warning=null, FeatureBreaks="Personalized ad experiences in apps disabled.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' /v 'Enabled' /t REG_DWORD /d 0 /f"},

        new() { Id=4, Title="Disable Activity History & Timeline", Category="privacy",
            Description="Stops Windows from recording which apps and files you open, and disables syncing activity to Microsoft servers.",
            Warning=null, FeatureBreaks="Windows Timeline feature disabled. Activity sync across devices stops.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System' /v 'EnableActivityFeed' /t REG_DWORD /d 0 /f; reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System' /v 'PublishUserActivities' /t REG_DWORD /d 0 /f"},

        new() { Id=5, Title="Disable Customer Experience Improvement Program", Category="privacy",
            Description="Opts out of Microsoft's CEIP which silently collects data about how you use Windows.",
            Warning=null, FeatureBreaks="Microsoft won't improve certain features based on your usage.",
            PowerShellCommand=@"schtasks /change /tn 'Microsoft\Windows\Customer Experience Improvement Program\Consolidator' /disable; schtasks /change /tn 'Microsoft\Windows\Customer Experience Improvement Program\UsbCeip' /disable"},

        new() { Id=6, Title="Disable Windows Error Reporting", Category="privacy",
            Description="Prevents Windows from automatically sending error and crash reports to Microsoft.",
            Warning=null, FeatureBreaks="Microsoft won't receive crash data. Some apps may not offer auto-troubleshooting.",
            PowerShellCommand=@"sc stop WerSvc; sc config WerSvc start= disabled; reg add 'HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting' /v 'Disabled' /t REG_DWORD /d 1 /f"},

        new() { Id=7, Title="Disable Clipboard History & Cloud Sync", Category="privacy",
            Description="Disables clipboard history (Win+V) and stops clipboard content from syncing to the cloud.",
            Warning=null, FeatureBreaks="Win+V clipboard history disabled. Clipboard no longer syncs between devices.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Clipboard' /v 'EnableClipboardHistory' /t REG_DWORD /d 0 /f"},

        new() { Id=8, Title="Disable Start Menu Suggestions & Tips", Category="privacy",
            Description="Removes app suggestions, ads, and tips from Start menu, Settings app, and Windows tips notifications.",
            Warning=null, FeatureBreaks="Microsoft app suggestions and promotional content disabled in Start and Settings.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' /v 'SystemPaneSuggestionsEnabled' /t REG_DWORD /d 0 /f; reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' /v 'SubscribedContent-338388Enabled' /t REG_DWORD /d 0 /f"},

        new() { Id=9, Title="Maximum Performance Power Plan", Category="performance",
            Description="Activates the hidden Ultimate Performance power plan which prevents CPU from throttling.",
            Warning="LAPTOP USERS: This significantly increases battery drain and heat. Only use on mains power.",
            FeatureBreaks="Significantly higher power consumption and heat. Not suitable for laptops on battery.",
            PowerShellCommand=@"powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61; powercfg -setactive e9a42b02-d5df-448d-aa00-03f14749eb61"},

        new() { Id=10, Title="Disable SuperFetch / SysMain", Category="performance",
            Description="Stops the SysMain service which preloads frequently used apps into RAM. Greatest benefit on HDDs.",
            Warning="HDD USERS: Recommended. SSD/NVMe USERS: Benefit is minimal but safe.",
            FeatureBreaks="Apps may load slightly slower on first launch on HDD systems.",
            PowerShellCommand=@"sc stop SysMain; sc config SysMain start= disabled"},

        new() { Id=11, Title="Disable NTFS Access Timestamps", Category="performance",
            Description="Disables automatic recording of last-access timestamps on NTFS files, reducing unnecessary disk writes.",
            Warning=null, FeatureBreaks="Some backup or sync software that tracks file access times may not work correctly.",
            PowerShellCommand=@"fsutil behavior set disableLastAccess 1"},

        new() { Id=12, Title="Disable Windows Performance Counters", Category="performance",
            Description="Disables background performance monitoring counters, freeing up minor CPU overhead.",
            Warning=null, FeatureBreaks="Task Manager performance details may be reduced.",
            PowerShellCommand=@"lodctr /d: disabled"},

        new() { Id=13, Title="Disable Windows File Indexing", Category="performance",
            Description="Stops the Windows Search Indexer from continuously indexing files. HDD users see biggest benefit.",
            Warning="HDD USERS: Strongly recommended. SSD USERS: Lower but still worthwhile benefit.",
            FeatureBreaks="Windows Search will be slower as it searches without an index.",
            PowerShellCommand=@"sc stop WSearch; sc config WSearch start= disabled"},

        new() { Id=14, Title="Disable Multiplane Overlay (MPO)", Category="performance",
            Description="Disables the GPU MPO feature which causes stuttering and flickering in many games.",
            Warning="DISCRETE GPU REQUIRED: Only applies to systems with a dedicated NVIDIA or AMD GPU.",
            FeatureBreaks="Fixes stuttering and flickering for most games with dedicated GPU.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows\Dwm' /v 'OverlayTestMode' /t REG_DWORD /d 5 /f"},

        new() { Id=15, Title="Disable Hibernation", Category="performance",
            Description="Disables hibernation mode and deletes hiberfil.sys, freeing disk space equal to your total RAM.",
            Warning="LAPTOP USERS: Only apply if you never use hibernation. Desktop users can apply safely.",
            FeatureBreaks="Hibernation disabled. Fast Startup disabled. Free space gained equals your total RAM.",
            PowerShellCommand=@"powercfg -h off"},

        new() { Id=16, Title="Disable Background Apps (Legacy)", Category="performance",
            Description="Disables background app access for UWP apps. The registry policy still functions on Windows 11.",
            Warning="This setting was removed from Windows 11 Settings UI but the registry policy still works.",
            FeatureBreaks="UWP apps won't refresh in background. Push notifications may be delayed.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' /v 'LetAppsRunInBackground' /t REG_DWORD /d 2 /f"},

        new() { Id=17, Title="Optimize Visual Effects for Performance", Category="performance",
            Description="Sets Windows to 'Adjust for best performance' mode, disabling all visual effects.",
            Warning=null, FeatureBreaks="Windows looks more basic — no animations, shadows, transparency, or fading effects.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' /v 'VisualFXSetting' /t REG_DWORD /d 2 /f; SystemPropertiesPerformance.exe"},

        new() { Id=18, Title="Disable Cortana", Category="performance",
            Description="Disables Cortana via Group Policy registry keys, preventing it from loading at startup.",
            Warning=null, FeatureBreaks="Cortana voice assistant and AI features disabled. Start menu search still works.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search' /v 'AllowCortana' /t REG_DWORD /d 0 /f"},

        new() { Id=19, Title="Disable Mouse Acceleration", Category="gaming",
            Description="Turns off Windows Pointer Precision (mouse acceleration), giving a true 1:1 relationship.",
            Warning=null, FeatureBreaks="Mouse movement will feel different. Requires re-adjustment of sensitivity.",
            PowerShellCommand=@"reg add 'HKCU\Control Panel\Mouse' /v 'MouseSpeed' /t REG_SZ /d '0' /f; reg add 'HKCU\Control Panel\Mouse' /v 'MouseThreshold1' /t REG_SZ /d '0' /f; reg add 'HKCU\Control Panel\Mouse' /v 'MouseThreshold2' /t REG_SZ /d '0' /f"},

        new() { Id=20, Title="Keep All CPU Cores Active (Unpark Cores)", Category="gaming",
            Description="Forces all CPU cores to remain active and prevents Windows from parking idle cores.",
            Warning="NOT RECOMMENDED for AMD Ryzen X3D processors — thermal management relies on core parking.",
            FeatureBreaks="Higher idle power consumption. All cores stay fully active permanently.",
            PowerShellCommand=@"powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100; powercfg -setactive scheme_current"},

        new() { Id=21, Title="Minimum Priority for Background Processes", Category="gaming",
            Description="Sets background processes to lower priority so games get more CPU time.",
            Warning=null, FeatureBreaks="Background downloads, updates, and tasks will be slower while gaming.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' /v 'SystemResponsiveness' /t REG_DWORD /d 10 /f"},

        new() { Id=22, Title="Disable Network Power Saving", Category="gaming",
            Description="Prevents Windows from reducing the power state of the network adapter to save energy.",
            Warning=null, FeatureBreaks="Slightly higher power draw from the network adapter.",
            PowerShellCommand=@"$adapters = Get-NetAdapter; foreach ($a in $adapters) { powercfg -setacvalueindex scheme_current sub_none NDISNWINTERFACEPOWERSTATE 0 }"},

        new() { Id=23, Title="Disable GameBar", Category="gaming",
            Description="Completely disables the Xbox GameBar overlay, freeing up minor system resources.",
            Warning=null, FeatureBreaks="Cannot use GameBar overlay (Win+G). Screenshot/clip shortcuts via GameBar disabled.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR' /v 'AppCaptureEnabled' /t REG_DWORD /d 0 /f; reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\GameDVR' /v 'AllowGameDVR' /t REG_DWORD /d 0 /f"},

        new() { Id=24, Title="Disable GameBar Background Recording", Category="gaming",
            Description="Disables the background game clip recording feature (Game DVR) which constantly monitors gameplay.",
            Warning=null, FeatureBreaks="No automatic background game clip recording.",
            PowerShellCommand=@"reg add 'HKCU\System\GameConfigStore' /v 'GameDVR_Enabled' /t REG_DWORD /d 0 /f"},

        new() { Id=25, Title="Optimize for Windowed & Borderless Games", Category="gaming",
            Description="Applies DWM tweaks to reduce latency in windowed and borderless fullscreen mode.",
            Warning=null, FeatureBreaks="Minimal. May affect desktop compositing effects slightly.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows\Dwm' /v 'ForceEffectMode' /t REG_DWORD /d 2 /f"},

        new() { Id=26, Title="Enable Game Mode", Category="gaming",
            Description="Turns on Windows Game Mode which prioritizes CPU and GPU resources for the active game.",
            Warning="Do NOT enable if you use Process Lasso — they conflict.",
            FeatureBreaks="Background processes get fewer resources while gaming.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\GameBar' /v 'AllowAutoGameMode' /t REG_DWORD /d 1 /f; reg add 'HKCU\SOFTWARE\Microsoft\GameBar' /v 'AutoGameModeEnabled' /t REG_DWORD /d 1 /f"},

        new() { Id=27, Title="Enable Hardware Accelerated GPU Scheduling (HAGS)", Category="gaming",
            Description="Allows the GPU to manage its own VRAM and scheduling directly, reducing CPU bottleneck.",
            Warning="Requires NVIDIA GTX 10-series or AMD RX 5000+ GPU and Windows 10 version 2004 or newer.",
            FeatureBreaks="Restart required. May cause issues on older or unsupported GPUs.",
            PowerShellCommand=@"reg add 'HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' /v 'HwSchMode' /t REG_DWORD /d 2 /f"},

        new() { Id=28, Title="Instant Menu Response (Zero Delay)", Category="gaming",
            Description="Sets MenuShowDelay to 0ms, removing the delay before context menus appear.",
            Warning=null, FeatureBreaks="Menus appear instantly. Purely visual change with no side effects.",
            PowerShellCommand=@"reg add 'HKCU\Control Panel\Desktop' /v 'MenuShowDelay' /t REG_SZ /d '0' /f"},

        new() { Id=29, Title="Disable Full Screen Optimizations", Category="gaming",
            Description="Prevents Windows from modifying how fullscreen applications run.",
            Warning=null, FeatureBreaks="Some DirectX 12 games may not benefit from Windows fullscreen optimizations.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers' /v 'C:\Windows\System32\dwm.exe' /t REG_SZ /d '~ DISABLEDXMAXIMIZEDWINDOWEDMODE' /f"},

        new() { Id=30, Title="System Responsiveness & Network Throttling", Category="gaming",
            Description="Sets NetworkThrottlingIndex to 10 and SystemResponsiveness to 10, reducing latency.",
            Warning=null, FeatureBreaks="Slightly more CPU time allocated to foreground tasks.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' /v 'NetworkThrottlingIndex' /t REG_DWORD /d 10 /f; reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' /v 'SystemResponsiveness' /t REG_DWORD /d 10 /f"},

        new() { Id=31, Title="GPU & CPU Priority for Games", Category="gaming",
            Description="Configures Windows Multimedia SystemProfile Tasks\\Games with GPU Priority 8, CPU Priority 6, Scheduling Category High.",
            Warning=null, FeatureBreaks="Background applications receive fewer scheduler slots while a game is running.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' /v 'GPU Priority' /t REG_DWORD /d 8 /f; reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' /v 'Priority' /t REG_DWORD /d 6 /f; reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' /v 'Scheduling Category' /t REG_SZ /d 'High' /f"},

        new() { Id=32, Title="Fortnite Process High Priority", Category="gaming",
            Description="FORTNITE ONLY. Sets CPU priority to Realtime and I/O priority to High for FortniteClient.",
            Warning="FORTNITE PLAYERS ONLY. Realtime priority is the highest possible level.",
            FeatureBreaks="All other applications get lower CPU priority while Fortnite is running.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\FortniteClient-Win64-Shipping.exe\PerfOptions' /v 'CpuPriorityClass' /t REG_DWORD /d 3 /f"},

        new() { Id=33, Title="Disable Dynamic Tick", Category="gaming",
            Description="Disables the dynamic CPU timer tick so Windows uses a consistent 1ms timer at all times.",
            Warning="Requires a reboot to take effect. Slightly increases idle CPU wake frequency.",
            FeatureBreaks="Requires reboot. Slightly more CPU activity at idle.",
            PowerShellCommand=@"bcdedit /set disabledynamictick yes"},

        new() { Id=34, Title="Disable Nagle's Algorithm", Category="gaming",
            Description="Forces TCP packets to be sent immediately with zero buffering delay, lowering in-game ping.",
            Warning=null, FeatureBreaks="Marginally higher bandwidth usage. Benefit is lower and more consistent in-game ping.",
            PowerShellCommand=@"$interfaces = Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'; foreach ($i in $interfaces) { Set-ItemProperty -Path $i.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWORD -Force; Set-ItemProperty -Path $i.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWORD -Force }"},

        new() { Id=35, Title="Disable Xbox Core Services", Category="gaming",
            Description="Stops and disables background Xbox services: XboxGipSvc, XblAuthManager, XblGameSave, XboxNetApiSvc.",
            Warning=null, FeatureBreaks="Xbox Live features, Xbox controller remapping, and Xbox Live game saves won't function.",
            PowerShellCommand=@"'XboxGipSvc','XblAuthManager','XblGameSave','XboxNetApiSvc' | ForEach-Object { sc stop $_; sc config $_ start= disabled }"},

        new() { Id=36, Title="Disable IPv6", Category="system",
            Description="Completely disables the IPv6 networking protocol stack on all network adapters.",
            Warning=null, FeatureBreaks="Services using IPv6 exclusively may be unreachable. Most consumer networks are IPv4.",
            PowerShellCommand=@"reg add 'HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' /v 'DisabledComponents' /t REG_DWORD /d 255 /f"},

        new() { Id=37, Title="Prefer IPv4 over IPv6", Category="system",
            Description="Configures Windows to prefer IPv4 connections over IPv6 when both are available.",
            Warning=null, FeatureBreaks="Minimal. IPv6 still works but is deprioritized.",
            PowerShellCommand=@"reg add 'HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' /v 'DisabledComponents' /t REG_DWORD /d 32 /f"},

        new() { Id=38, Title="Enable SSD TRIM Optimization", Category="system",
            Description="Ensures the TRIM command is enabled for SSDs to maintain performance and longevity.",
            Warning=null, FeatureBreaks="No negative effects. Safe for all systems. Only affects SSD drives.",
            PowerShellCommand=@"fsutil behavior set DisableDeleteNotify 0"},

        new() { Id=39, Title="Disable Web Search in Windows Search", Category="system",
            Description="Removes Bing web search results from Start menu and taskbar search.",
            Warning=null, FeatureBreaks="Web search results won't appear in Start menu.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search' /v 'DisableWebSearch' /t REG_DWORD /d 1 /f; reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' /v 'BingSearchEnabled' /t REG_DWORD /d 0 /f"},

        new() { Id=40, Title="Disable Windows TCP Auto-Tuning", Category="system",
            Description="Disables TCP receive window auto-tuning which can cause higher latency on certain networks.",
            Warning=null, FeatureBreaks="Large file downloads may be slightly slower. Beneficial for gaming latency.",
            PowerShellCommand=@"netsh int tcp set global autotuninglevel=disabled"},

        new() { Id=41, Title="Disable Startup Program Delay", Category="system",
            Description="Removes the built-in 10-second startup delay before startup programs launch.",
            Warning=null, FeatureBreaks="Startup apps load immediately. No negative effects for most users.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize' /v 'StartupDelayInMSec' /t REG_DWORD /d 0 /f"},

        new() { Id=42, Title="Disable Windows Automatic Maintenance", Category="system",
            Description="Stops Windows from auto-running maintenance tasks that cause unexpected CPU and disk spikes.",
            Warning=null, FeatureBreaks="Automatic maintenance disabled. Run Disk Cleanup and Defender manually occasionally.",
            PowerShellCommand=@"schtasks /change /tn 'Microsoft\Windows\TaskScheduler\Maintenance Configurator' /disable"},

        new() { Id=43, Title="Disable Power Throttling", Category="system",
            Description="Disables Windows Power Throttling which reduces CPU power to background processes.",
            Warning="LAPTOP USERS: Will increase power consumption and heat. Only apply when plugged in.",
            FeatureBreaks="Background apps may use more CPU power. Battery life reduced on laptops.",
            PowerShellCommand=@"reg add 'HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' /v 'PowerThrottlingOff' /t REG_DWORD /d 1 /f"},

        new() { Id=44, Title="Debloat Microsoft Edge", Category="browser",
            Description="EDGE USERS ONLY. Disables tracking, telemetry, Copilot, AI features, shopping assistant, Bing Chat.",
            Warning="MICROSOFT EDGE USERS ONLY — skip if you use Chrome, Firefox, or another browser.",
            FeatureBreaks="Edge Copilot, AI Compose, shopping assistant, Bing Chat, sidebar all disabled.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Microsoft\Edge' /v 'UserFeedbackAllowed' /t REG_DWORD /d 0 /f; reg add 'HKLM\SOFTWARE\Policies\Microsoft\Edge' /v 'HubsSidebarEnabled' /t REG_DWORD /d 0 /f"},

        new() { Id=45, Title="Debloat Google Chrome", Category="browser",
            Description="CHROME USERS ONLY. Disables hardware acceleration, background running, usage stats and crash reports.",
            Warning="GOOGLE CHROME USERS ONLY — skip if you use Edge, Firefox, Opera GX, or another browser.",
            FeatureBreaks="Hardware acceleration off. Chrome won't run in background after closing.",
            PowerShellCommand=@"reg add 'HKLM\SOFTWARE\Policies\Google\Chrome' /v 'MetricsReportingEnabled' /t REG_DWORD /d 0 /f; reg add 'HKLM\SOFTWARE\Policies\Google\Chrome' /v 'BackgroundModeEnabled' /t REG_DWORD /d 0 /f"},

        new() { Id=46, Title="Debloat Opera GX", Category="browser",
            Description="OPERA GX USERS ONLY. Disables hardware acceleration, GX sounds, and background processes.",
            Warning="OPERA GX USERS ONLY — skip if you use Chrome, Edge, Firefox, or another browser.",
            FeatureBreaks="Opera GX sound effects disabled. GPU rendering off. Background processes disabled.",
            PowerShellCommand=@"reg add 'HKCU\SOFTWARE\Opera Software\Opera GX Stable' /v 'HardwareAccelerationModeEnabled' /t REG_DWORD /d 0 /f"},

        new() { Id=47, Title="Optimize Discord for Gaming", Category="browser",
            Description="DISCORD USERS ONLY. Disables game overlay, hardware acceleration, and lowers Discord's process priority.",
            Warning="DISCORD USERS ONLY — skip if you do not use Discord.",
            FeatureBreaks="Discord overlay won't appear over games. Discord animations may be less smooth.",
            PowerShellCommand=@"Get-Process discord -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'BelowNormal' }"},
    };
}
