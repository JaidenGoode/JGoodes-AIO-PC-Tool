// PowerShell commands for each tweak (by title match)
// All commands require running as Administrator in PowerShell

export interface TweakCommand {
  enable: string;
  disable: string;
  requiresRestart?: boolean;
  requiresAdmin?: boolean;
}

export const TWEAK_COMMANDS: Record<string, TweakCommand> = {
  // ── PERFORMANCE ────────────────────────────────────────────────────────────
  "Disable SuperFetch / SysMain": {
    requiresAdmin: true,
    enable: `Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue
Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name "SysMain" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name "SysMain" -ErrorAction SilentlyContinue`,
  },

  "Disable NTFS Access Timestamps": {
    requiresAdmin: true,
    enable: `fsutil behavior set disablelastaccess 1`,
    disable: `fsutil behavior set disablelastaccess 0
fsutil behavior set disablelastaccess 2`,
  },

  "Disable Windows File Indexing": {
    requiresAdmin: true,
    enable: `sc.exe stop "wsearch" 2>&1 | Out-Null
sc.exe config "wsearch" start= disabled 2>&1 | Out-Null`,
    disable: `sc.exe config "wsearch" start= delayed-auto 2>&1 | Out-Null
sc.exe start "wsearch" 2>&1 | Out-Null`,
  },

  "Disable Multiplane Overlay (MPO)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v OverlayTestMode /t REG_DWORD /d 5 /f`,
    disable: `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" -Name "OverlayTestMode" -Force -ErrorAction SilentlyContinue`,
  },

  "Disable Hibernation": {
    requiresAdmin: true,
    enable: `powercfg /hibernate off
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f`,
    disable: `powercfg /hibernate on
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 1 /f`,
  },

  "Optimize Visual Effects for Performance": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f
reg add "HKCU\\Control Panel\\Desktop" /v DragFullWindows /t REG_SZ /d 0 /f
reg add "HKCU\\Control Panel\\Desktop" /v MenuShowDelay /t REG_SZ /d 0 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ListviewAlphaSelect /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ListviewShadow /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v IconsOnly /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v EnableAeroPeek /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v AlwaysHibernateThumbnails /t REG_DWORD /d 0 /f
reg add "HKCU\\Control Panel\\Desktop" /v FontSmoothing /t REG_SZ /d 2 /f
reg add "HKCU\\Control Panel\\Desktop" /v FontSmoothingType /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 0 /f
reg add "HKCU\\Control Panel\\Desktop" /v DragFullWindows /t REG_SZ /d 1 /f
reg add "HKCU\\Control Panel\\Desktop" /v MenuShowDelay /t REG_SZ /d 400 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ListviewAlphaSelect /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ListviewShadow /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v IconsOnly /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v EnableAeroPeek /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v AlwaysHibernateThumbnails /t REG_DWORD /d 1 /f
reg add "HKCU\\Control Panel\\Desktop" /v FontSmoothing /t REG_SZ /d 2 /f
reg add "HKCU\\Control Panel\\Desktop" /v FontSmoothingType /t REG_DWORD /d 2 /f`,
  },

  "Disable Cortana": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v ConnectedSearchUseWeb /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v ConnectedSearchUseWeb /t REG_DWORD /d 1 /f`,
  },

  "Disable Mouse Acceleration": {
    enable: `reg add "HKCU\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "0" /f`,
    disable: `reg add "HKCU\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d "1" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d "6" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "10" /f`,
  },

  "Keep All CPU Cores Active (Unpark Cores)": {
    requiresAdmin: true,
    enable: `powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR 0cc5b647-c1df-4637-891a-dec35c318583 100
powercfg -setactive SCHEME_CURRENT`,
    disable: `powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR 0cc5b647-c1df-4637-891a-dec35c318583 0
powercfg -setactive SCHEME_CURRENT`,
  },

  "Win32 Priority Separation": {
    requiresAdmin: true,
    // 0x24 = 36 decimal = fixed short quanta, max foreground boost (gaming-optimal)
    // 0x26 = 38 decimal = variable quanta, short foreground boost (Windows default)
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 36 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 38 /f`,
  },

  "Disable Background UWP Apps": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 0 /f`,
  },

  "Disable GameBar": {
    requiresAdmin: true,
    enable: `Get-AppxPackage -AllUsers Microsoft.XboxGamingOverlay -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v UseNexusForGameBarEnabled /t REG_DWORD /d 0 /f`,
    disable: `Get-AppxPackage -AllUsers Microsoft.XboxGamingOverlay -ErrorAction SilentlyContinue | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\\AppXManifest.xml" -ErrorAction SilentlyContinue }
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v UseNexusForGameBarEnabled /t REG_DWORD /d 1 /f`,
  },

  "Disable GameBar Background Recording": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 1 /f`,
  },

  "Optimize for Windowed & Borderless Games": {
    enable: `reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEOptimization /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEOptimization /t REG_DWORD /d 0 /f`,
  },

  "Enable Game Mode": {
    enable: `reg add "HKCU\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v AllowAutoGameMode /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v AllowAutoGameMode /t REG_DWORD /d 0 /f`,
  },

  "Enable Hardware Accelerated GPU Scheduling (HAGS)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" /v HwSchMode /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" /v HwSchMode /t REG_DWORD /d 1 /f`,
  },

  "Instant Menu Response (Zero Delay)": {
    enable: `reg add "HKCU\\Control Panel\\Desktop" /v MenuShowDelay /t REG_SZ /d "0" /f`,
    disable: `reg add "HKCU\\Control Panel\\Desktop" /v MenuShowDelay /t REG_SZ /d "400" /f`,
  },

  "Disable Full Screen Optimizations": {
    enable: `reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /t REG_DWORD /d 2 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /t REG_DWORD /d 2 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_HonorUserFSEBehaviorMode /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_HonorUserFSEBehaviorMode /t REG_DWORD /d 0 /f`,
  },

  "System Responsiveness & Network Throttling": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 0xFFFFFFFF /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 10 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 20 /f`,
  },

  "Maximum Priority for Games": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Affinity /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /t REG_SZ /d "False" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Clock Rate" /t REG_DWORD /d 10000 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 6 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "True" /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Affinity /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /t REG_SZ /d "False" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Clock Rate" /t REG_DWORD /d 10000 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "Medium" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "Normal" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "False" /f`,
  },

  "Fortnite Process High Priority": {
    requiresAdmin: true,
    // CpuPriorityClass: 5=High, IoPriority: 3=High via IFEO PerfOptions.
    // Windows default: these IFEO keys do NOT exist — revert deletes them entirely.
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 5 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 5 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f`,
    // Revert: remove the IFEO keys entirely — Windows default is no priority override
    disable: `Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe" -Force -ErrorAction SilentlyContinue`,
  },

  "Disable Xbox Core Services": {
    requiresAdmin: true,
    enable: `@("XboxGipSvc","XblAuthManager","XblGameSave","XboxNetApiSvc") | ForEach-Object {
    Set-Service -Name $_ -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name $_ -Force -ErrorAction SilentlyContinue
}`,
    disable: `@("XboxGipSvc","XblAuthManager","XblGameSave","XboxNetApiSvc") | ForEach-Object {
    Set-Service -Name $_ -StartupType Manual -ErrorAction SilentlyContinue
}`,
  },

  "Prefer IPv4 over IPv6": {
    requiresAdmin: true,
    enable: `netsh interface ipv6 set prefix ::ffff:0:0/96 60 4 2>$null
netsh interface ipv6 set prefix ::/0 50 3 2>$null`,
    disable: `netsh interface ipv6 delete prefixpolicy ::ffff:0:0/96 2>$null
netsh interface ipv6 set prefix ::/0 40 1 2>$null`,
  },

  "Disable Web Search in Windows Search": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v CortanaConsent /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v CortanaConsent /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows TCP Auto-Tuning": {
    requiresAdmin: true,
    enable: `netsh int tcp set global autotuninglevel=disabled`,
    disable: `netsh int tcp set global autotuninglevel=normal`,
  },

  "Disable Startup Program Delay": {
    enable: `If (-Not (Test-Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize")) {
    New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Force | Out-Null
}
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f`,
    // Revert: remove the key entirely — StartupDelayInMSec does NOT exist by default (Windows default = 10s delay built-in)
    disable: `Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Name StartupDelayInMSec -Force -ErrorAction SilentlyContinue`,
  },

  "Disable Windows Automatic Maintenance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" /v MaintenanceDisabled /t REG_DWORD /d 1 /f`,
    disable: `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name MaintenanceDisabled -Force -ErrorAction SilentlyContinue`,
  },

  "Disable Power Throttling": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 0 /f`,
  },

  "Disable Phone Link & Mobile Sync": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /t REG_DWORD /d 1 /f`,
  },

  "Auto-End Unresponsive Programs": {
    enable: `reg add "HKCU\\Control Panel\\Desktop" /v AutoEndTasks /t REG_SZ /d "1" /f
reg add "HKCU\\Control Panel\\Desktop" /v HungAppTimeout /t REG_SZ /d "1000" /f
reg add "HKCU\\Control Panel\\Desktop" /v WaitToKillAppTimeout /t REG_SZ /d "2000" /f`,
    disable: `reg add "HKCU\\Control Panel\\Desktop" /v AutoEndTasks /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Desktop" /v HungAppTimeout /t REG_SZ /d "5000" /f
reg add "HKCU\\Control Panel\\Desktop" /v WaitToKillAppTimeout /t REG_SZ /d "20000" /f`,
  },

  "Disable Scheduled Disk Defragmentation": {
    requiresAdmin: true,
    enable: `Get-ScheduledTask -TaskName "ScheduledDefrag" -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue`,
    disable: `Get-ScheduledTask -TaskName "ScheduledDefrag" -ErrorAction SilentlyContinue | Enable-ScheduledTask -ErrorAction SilentlyContinue`,
  },

  "Keep Kernel & Drivers in RAM": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v DisablePagingExecutive /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v DisablePagingExecutive /t REG_DWORD /d 0 /f`,
  },

  "Disable Memory Compression": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue`,
    disable: `Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue`,
  },

  "Svchost Process Isolation": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `$ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1KB
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d $ram /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d 3670016 /f`,
  },

  "Disable 8.3 Short File Names": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 0 /f`,
  },

  "Optimize Boot Configuration": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `# Disable GUI Boot (No GUI at startup)
bcdedit /set '{current}' quietboot yes 2>$null
bcdedit /set '{current}' bootuxdisabled on 2>$null

# Enable Fast Startup
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" -Name "HiberbootEnabled" -Value 1

# Disable Memory Compression
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "Compression" -Value 0`,
    disable: `# Re-enable GUI Boot
bcdedit /set '{current}' quietboot no 2>$null
bcdedit /set '{current}' bootuxdisabled off 2>$null

# Disable Fast Startup
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" -Name "HiberbootEnabled" -Value 0

# Re-enable Memory Compression
Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "Compression" -Value 1`,
  },

  "Disable Taskbar & Menu Animations": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 0 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d "0" /f
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 1 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d "1" /f
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue`,
  },

  "Reduce Taskbar Preview Delay": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ExtendedUIHoverTime /t REG_DWORD /d 100 /f`,
    disable: `Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name ExtendedUIHoverTime -Force -ErrorAction SilentlyContinue`,
  },

  "Disable AutoPlay for External Devices": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 145 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 145 /f`,
  },

  "Disable Notification Center": {
    enable: `If (-Not (Test-Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer")) {
    New-Item -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Force | Out-Null
}
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v ToastEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v ToastEnabled /t REG_DWORD /d 1 /f`,
  },

  "Reduce Keyboard Input Delay": {
    enable: `reg add "HKCU\\Control Panel\\Keyboard" /v KeyboardDelay /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Keyboard" /v KeyboardSpeed /t REG_SZ /d "31" /f`,
    disable: `reg add "HKCU\\Control Panel\\Keyboard" /v KeyboardDelay /t REG_SZ /d "1" /f
reg add "HKCU\\Control Panel\\Keyboard" /v KeyboardSpeed /t REG_SZ /d "31" /f`,
  },

  "Unlock Reserved Network Bandwidth": {
    requiresAdmin: true,
    enable: `If (-Not (Test-Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched")) {
    New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" -Force | Out-Null
}
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 20 /f`,
  },


  "Disable Auto-Restart After Windows Updates": {
    requiresAdmin: true,
    enable: `If (-Not (Test-Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU")) {
    New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Force | Out-Null
}
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 0 /f`,
  },

  "Disable Transparency Effects": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 1 /f`,
  },

  "Disable Tile Notification System": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v DisableTileNotification /t REG_DWORD /d 1 /f
reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v NoTileApplicationNotification /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v DisableTileNotification /t REG_DWORD /d 0 /f
reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v NoTileApplicationNotification /t REG_DWORD /d 0 /f`,
  },

  "Disable USB Selective Suspend": {
    requiresAdmin: true,
    enable: `$usbGuid = "2a737441-1930-4402-8d77-b2bebba308a3"
$usbSub  = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
powercfg /SETACVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 0 2>$null
powercfg /SETDCVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 0 2>$null
powercfg /SETACTIVE SCHEME_CURRENT 2>$null`,
    disable: `$usbGuid = "2a737441-1930-4402-8d77-b2bebba308a3"
$usbSub  = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
powercfg /SETACVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 1 2>$null
powercfg /SETDCVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 1 2>$null
powercfg /SETACTIVE SCHEME_CURRENT 2>$null`,
  },

  "Disable Windows Error Reporting": {
    requiresAdmin: true,
    enable: `sc.exe stop WerSvc 2>&1 | Out-Null
sc.exe config WerSvc start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WerSvc" /v Start /t REG_DWORD /d 4 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WerSvc" /v Start /t REG_DWORD /d 3 /f
sc.exe config WerSvc start= demand 2>&1 | Out-Null`,
  },

  "Disable Connected Telemetry (DiagTrack)": {
    requiresAdmin: true,
    enable: `Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name "dmwappushservice" -Force -ErrorAction SilentlyContinue
Set-Service -Name "dmwappushservice" -StartupType Disabled -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f`,
    disable: `Set-Service -Name "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
Set-Service -Name "dmwappushservice" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name "dmwappushservice" -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 3 /f`,
  },

  "Disable Application Compatibility Telemetry": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /t REG_DWORD /d 1 /f
sc.exe stop PcaSvc 2>&1 | Out-Null
sc.exe config PcaSvc start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v Start /t REG_DWORD /d 4 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v Start /t REG_DWORD /d 3 /f
sc.exe config PcaSvc start= demand 2>&1 | Out-Null`,
  },

  "Disable Windows Activity History": {
    requiresAdmin: true,
    enable: `If (-Not (Test-Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System")) {
    New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Force | Out-Null
}
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 1 /f`,
  },

  "Disable Windows Advertising ID": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows Content Delivery Manager": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v ContentDeliveryAllowed /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v FeatureManagementEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v OemPreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v PreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SilentInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353698Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v ContentDeliveryAllowed /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v FeatureManagementEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v OemPreInstalledAppsEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v PreInstalledAppsEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SilentInstalledAppsEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353698Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 1 /f`,
  },

  "Disable Clipboard History Collection": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /t REG_DWORD /d 0 /f`,
  },

  "Disable Virtualization-Based Security (VBS)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `bcdedit /set hypervisorlaunchtype off 2>$null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v RequirePlatformSecurityFeatures /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v HypervisorEnforcedCodeIntegrity /t REG_DWORD /d 0 /f`,
    disable: `bcdedit /set hypervisorlaunchtype auto 2>$null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v RequirePlatformSecurityFeatures /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v HypervisorEnforcedCodeIntegrity /t REG_DWORD /d 0 /f`,
  },

  "Raise System Timer IRQ Priority": {
    requiresAdmin: true,
    requiresRestart: true,
    // Sets GlobalTimerResolutionRequests=1, disables dynamic tick, and sets TSC sync to Enhanced
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Kernel" /v GlobalTimerResolutionRequests /t REG_DWORD /d 1 /f
bcdedit /set disabledynamictick yes 2>$null
bcdedit /set tscsyncpolicy Enhanced 2>$null`,
    // Revert: delete GlobalTimerResolutionRequests (doesn't exist by default), restore dynamic tick, remove tscsyncpolicy
    disable: `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Kernel" -Name GlobalTimerResolutionRequests -Force -ErrorAction SilentlyContinue
bcdedit /deletevalue disabledynamictick 2>$null
bcdedit /deletevalue tscsyncpolicy 2>$null`,
  },

  "Foreground Application Priority Lock Timeout": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Control Panel\\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Control Panel\\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 200000 /f`,
  },

  "Disable Print Spooler": {
    requiresAdmin: true,
    enable: `sc.exe stop spooler 2>&1 | Out-Null
sc.exe config spooler start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\spooler" /v Start /t REG_DWORD /d 4 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\spooler" /v Start /t REG_DWORD /d 2 /f
sc.exe config spooler start= auto 2>&1 | Out-Null
sc.exe start spooler 2>&1 | Out-Null`,
  },

  "Disable Windows Copilot AI Sidebar": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 0 /f`,
  },

  "Disable Phone Link App": {
    requiresAdmin: true,
    enable: `Get-AppxPackage Microsoft.YourPhone -AllUsers -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
Get-AppxPackage Microsoft.Link2Windows -AllUsers -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue`,
    disable: `Get-AppxPackage -AllUsers Microsoft.YourPhone -ErrorAction SilentlyContinue | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\\AppXManifest.xml" -ErrorAction SilentlyContinue }`,
  },

  "Disable Windows 11 Widgets Panel": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 1 /f`,
  },

  // ── NETWORK (One-Click Optimization) ──────────────────────────────────────
  "Network Optimization": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `# Set Cloudflare DNS on Wi-Fi and Ethernet
netsh interface ip set dns "Wi-Fi" static 1.1.1.1 2>$null
netsh interface ip add dns "Wi-Fi" 1.0.0.1 index=2 2>$null
netsh interface ip set dns "Ethernet" static 1.1.1.1 2>$null
netsh interface ip add dns "Ethernet" 1.0.0.1 index=2 2>$null

# Enable DNS over HTTPS
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableAutoDoh /t REG_DWORD /d 2 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableDoh /t REG_DWORD /d 2 /f

# RSS queue count = 4
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" /v MaxNumRssCpus /t REG_DWORD /d 4 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v MaxNumRssCpus /t REG_DWORD /d 4 /f

# MaxNumRssThreads = logical processor count (auto-detect via WMI)
$lp = [int](Get-WmiObject Win32_ComputerSystem -ErrorAction SilentlyContinue).NumberOfLogicalProcessors
if ($lp -gt 0) {
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" /v MaxNumRssThreads /t REG_DWORD /d $lp /f
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v MaxNumRssThreads /t REG_DWORD /d $lp /f
}

# RssBaseCpu = physical core count (auto-detect via WMI)
$nc = [int](Get-WmiObject Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).NumberOfCores
if ($nc -gt 0) {
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" /v RssBaseCpu /t REG_DWORD /d $nc /f
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v RssBaseCpu /t REG_DWORD /d $nc /f
}

# Per-interface TCP tweaks + NetBIOS disable (iterate all NIC GUIDs via WMI)
$nicGuids = (Get-WmiObject Win32_NetworkAdapter -ErrorAction SilentlyContinue | Where-Object { $_.GUID -ne $null }).GUID
foreach ($guid in $nicGuids) {
    $g = $guid.Trim()
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" /v TCPNoDelay /t REG_DWORD /d 1 /f 2>$null
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" /v TcpNoDelay /t REG_DWORD /d 1 /f 2>$null
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" /v TcpDelAckTicks /t REG_DWORD /d 0 /f 2>$null
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" /v TcpAckFrequency /t REG_DWORD /d 1 /f 2>$null
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters\\Interfaces\\Tcpip_$g" /v NetbiosOptions /t REG_DWORD /d 2 /f 2>$null
}

# NIC driver parameter tweaks (all NICs with *SpeedDuplex key in class {4D36E972-E325-11CE-BFC1-08002bE10318})
$nicKeys = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4D36E972-E325-11CE-BFC1-08002bE10318}" -ErrorAction SilentlyContinue | Where-Object { (Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue)."*SpeedDuplex" -ne $null }
foreach ($key in $nicKeys) {
    $p = $key.Name
    reg add "$p" /v "*NumRssQueues" /t REG_SZ /d "4" /f 2>$null
    reg add "$p" /v "*SpeedDuplex" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "MIMOPowerSaveMode" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*WakeOnMagicPacket" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*WakeOnPattern" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*PacketCoalescing" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "ThroughputBoosterEnabled" /t REG_SZ /d "1" /f 2>$null
    reg add "$p" /v "FatChannelIntolerant" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*MiracastSupported" /t REG_DWORD /d 0 /f 2>$null
    reg add "$p" /v "*DeviceSleepOnDisconnect" /t REG_DWORD /d 0 /f 2>$null
    reg add "$p" /v "RoamAggressiveness" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "RoamingPreferredBandType" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "uAPSDSupport" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "RecommendedBeaconInterval" /t REG_DWORD /d 99999999 /f 2>$null
    reg add "$p" /v "*InterruptModeration" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*FlowControl" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*RSS" /t REG_SZ /d "1" /f 2>$null
    reg add "$p" /v "*TCPConnectionOffloadIPv4" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*TCPConnectionOffloadIPv6" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*IPChecksumOffloadIPv4" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*TCPChecksumOffloadIPv4" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*TCPChecksumOffloadIPv6" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*UDPChecksumOffloadIPv4" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*UDPChecksumOffloadIPv6" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*LsoV1IPv4" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*LsoV2IPv4" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*LsoV2IPv6" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*TCPUDPChecksumOffloadIPv4" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*TCPUDPChecksumOffloadIPv6" /t REG_SZ /d "3" /f 2>$null
    reg add "$p" /v "*PMARPOffload" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "Downshift" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*EEE" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*JumboPacket" /t REG_SZ /d "1514" /f 2>$null
    reg add "$p" /v "LogLinkStateEvent" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*QoS" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*PriorityVLANTag" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*ReceiveBuffers" /t REG_SZ /d "4096" /f 2>$null
    reg add "$p" /v "*RscIPv4" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*RscIPv6" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*TransmitBuffers" /t REG_SZ /d "8184" /f 2>$null
    reg add "$p" /v "WakeOnLink" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "WakeOnPing" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "WakeFromPowerOff" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "*PMNSOffload" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "TxIntDelay" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "TxAbsIntDelay" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "RxIntDelay" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "RxAbsIntDelay" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "FlowControlCap" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "ITR" /t REG_SZ /d "0" /f 2>$null
    reg add "$p" /v "PnPCapabilities" /t REG_DWORD /d 0x118 /f 2>$null
}

# MSI mode + Affinity Priority for all PCI NIC adapters
$pciNics = Get-WmiObject Win32_NetworkAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PNPDeviceID -like "PCI\\VEN_*" }
foreach ($nic in $pciNics) {
    $id = $nic.PNPDeviceID
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties" /v MSISupported /t REG_DWORD /d 1 /f 2>$null
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\Affinity Policy" /v DevicePriority /t REG_DWORD /d 0 /f 2>$null
}

# DevicePolicy=5 (Spread interrupts) when CPU has more than 4 cores
if ($nc -gt 4) {
    foreach ($nic in $pciNics) {
        $id = $nic.PNPDeviceID
        reg add "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\Affinity Policy" /v DevicePolicy /t REG_DWORD /d 5 /f 2>$null
    }
}`,
    disable: `# Restore DNS to automatic (DHCP) on Wi-Fi and Ethernet
netsh interface ip set dns "Wi-Fi" dhcp 2>$null
netsh interface ip set dns "Ethernet" dhcp 2>$null

# Remove DNS over HTTPS registry overrides
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableAutoDoh /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableDoh /t REG_DWORD /d 0 /f

# Remove RSS overrides (no key = Windows auto-selects)
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" -Name MaxNumRssCpus -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name MaxNumRssCpus -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" -Name MaxNumRssThreads -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name MaxNumRssThreads -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Ndis\\Parameters" -Name RssBaseCpu -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name RssBaseCpu -Force -ErrorAction SilentlyContinue

# Restore per-interface TCP settings and NetBIOS to Windows defaults
$nicGuids = (Get-WmiObject Win32_NetworkAdapter -ErrorAction SilentlyContinue | Where-Object { $_.GUID -ne $null }).GUID
foreach ($guid in $nicGuids) {
    $g = $guid.Trim()
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" -Name TCPNoDelay -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" -Name TcpNoDelay -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" -Name TcpDelAckTicks -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$g" -Name TcpAckFrequency -Force -ErrorAction SilentlyContinue
    reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters\\Interfaces\\Tcpip_$g" /v NetbiosOptions /t REG_DWORD /d 0 /f 2>$null
}

# Remove NIC driver parameter overrides (driver defaults restored on next device enumeration)
$nicKeys = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4D36E972-E325-11CE-BFC1-08002bE10318}" -ErrorAction SilentlyContinue | Where-Object { (Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue)."*SpeedDuplex" -ne $null }
$nicProps = @("*NumRssQueues","MIMOPowerSaveMode","*WakeOnMagicPacket","*WakeOnPattern","*PacketCoalescing","ThroughputBoosterEnabled","FatChannelIntolerant","*MiracastSupported","*DeviceSleepOnDisconnect","RoamAggressiveness","RoamingPreferredBandType","uAPSDSupport","RecommendedBeaconInterval","*InterruptModeration","*FlowControl","*TCPConnectionOffloadIPv4","*TCPConnectionOffloadIPv6","*IPChecksumOffloadIPv4","*TCPChecksumOffloadIPv4","*TCPChecksumOffloadIPv6","*UDPChecksumOffloadIPv4","*UDPChecksumOffloadIPv6","*LsoV1IPv4","*LsoV2IPv4","*LsoV2IPv6","*TCPUDPChecksumOffloadIPv4","*TCPUDPChecksumOffloadIPv6","*PMARPOffload","Downshift","*EEE","*JumboPacket","LogLinkStateEvent","*QoS","*PriorityVLANTag","*ReceiveBuffers","*RscIPv4","*RscIPv6","*TransmitBuffers","WakeOnLink","WakeOnPing","WakeFromPowerOff","*PMNSOffload","TxIntDelay","TxAbsIntDelay","RxIntDelay","RxAbsIntDelay","FlowControlCap","ITR","PnPCapabilities")
foreach ($key in $nicKeys) {
    foreach ($prop in $nicProps) {
        Remove-ItemProperty -Path $key.PSPath -Name $prop -Force -ErrorAction SilentlyContinue
    }
}

# Remove MSI and Affinity Policy overrides for PCI NICs
$pciNics = Get-WmiObject Win32_NetworkAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PNPDeviceID -like "PCI\\VEN_*" }
foreach ($nic in $pciNics) {
    $id = $nic.PNPDeviceID
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties" -Name MSISupported -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\Affinity Policy" -Name DevicePriority -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$id\\Device Parameters\\Interrupt Management\\Affinity Policy" -Name DevicePolicy -Force -ErrorAction SilentlyContinue
}`,
  },

};

export function getTweakCommand(title: string): TweakCommand | null {
  return TWEAK_COMMANDS[title] ?? null;
}

export function generatePowerShellScript(
  activeTweaks: Array<{ title: string; isActive: boolean }>
): string {
  const active = activeTweaks.filter((t) => t.isActive);
  if (active.length === 0) return "";

  const needsRestart = active.some(
    (t) => TWEAK_COMMANDS[t.title]?.requiresRestart
  );

  const lines: string[] = [
    "#Requires -RunAsAdministrator",
    "# JGoode A.I.O PC Tool - Generated Optimization Script",
    `# Generated: ${new Date().toLocaleString()}`,
    `# Active tweaks: ${active.length}`,
    "",
    "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force",
    'Write-Host "JGoode A.I.O PC Tool - Applying tweaks..." -ForegroundColor Cyan',
    "",
  ];

  for (const tweak of active) {
    const cmd = TWEAK_COMMANDS[tweak.title];
    if (!cmd) continue;
    lines.push(`# ── ${tweak.title} ──`);
    lines.push(`Write-Host "Applying: ${tweak.title}" -ForegroundColor Yellow`);
    lines.push(cmd.enable);
    lines.push("");
  }

  // Always restart Explorer so taskbar and Start menu reflect changes immediately
  lines.push('Write-Host "" ');
  lines.push('Write-Host "Restarting Windows Explorer (refreshes taskbar and Start menu)..." -ForegroundColor Cyan');
  lines.push("Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue");
  lines.push("Start-Sleep -Milliseconds 1000");
  lines.push("Start-Process explorer");
  lines.push('Write-Host "Explorer restarted." -ForegroundColor Green');
  lines.push('Write-Host "" ');
  lines.push(`Write-Host "Done! ${active.length} tweaks applied." -ForegroundColor Green`);

  if (needsRestart) {
    lines.push(
      'Write-Host "A full system restart is also recommended for some changes." -ForegroundColor Yellow'
    );
  }

  return lines.join("\n");
}

export function generateUndoScript(
  tweaks: Array<{ title: string; isActive: boolean }>
): string {
  const active = tweaks.filter((t) => t.isActive);
  const reversible = active.filter(
    (t) => TWEAK_COMMANDS[t.title]?.disable
  );
  if (reversible.length === 0) return "";

  const lines: string[] = [
    "#Requires -RunAsAdministrator",
    "# JGoode A.I.O PC Tool - UNDO Script",
    "# Reverts all currently active tweaks back to Windows defaults.",
    `# Generated: ${new Date().toLocaleString()}`,
    `# Tweaks to revert: ${reversible.length}`,
    "",
    "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force",
    'Write-Host "JGoode A.I.O PC Tool - Reverting tweaks..." -ForegroundColor Cyan',
    "",
  ];

  for (const tweak of reversible) {
    const cmd = TWEAK_COMMANDS[tweak.title];
    if (!cmd?.disable) continue;
    lines.push(`# ── Undo: ${tweak.title} ──`);
    lines.push(`Write-Host "Reverting: ${tweak.title}" -ForegroundColor Yellow`);
    lines.push(cmd.disable);
    lines.push("");
  }

  // Always restart Explorer so taskbar and Start menu reflect the reverted changes
  lines.push('Write-Host "" ');
  lines.push('Write-Host "Restarting Windows Explorer (refreshes taskbar and Start menu)..." -ForegroundColor Cyan');
  lines.push("Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue");
  lines.push("Start-Sleep -Milliseconds 1000");
  lines.push("Start-Process explorer");
  lines.push('Write-Host "Explorer restarted." -ForegroundColor Green');
  lines.push('Write-Host "" ');
  lines.push(`Write-Host "Done! ${reversible.length} tweaks reverted to defaults." -ForegroundColor Green`);
  lines.push('Write-Host "A full system restart is also recommended for all changes to take effect." -ForegroundColor Yellow');

  return lines.join("\n");
}
