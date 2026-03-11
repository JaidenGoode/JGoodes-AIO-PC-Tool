// PowerShell commands for each tweak (by title match)
// All commands require running as Administrator in PowerShell

export interface TweakCommand {
  enable: string;
  disable: string;
  requiresRestart?: boolean;
  requiresAdmin?: boolean;
}

export const TWEAK_COMMANDS: Record<string, TweakCommand> = {
  // ── PRIVACY ────────────────────────────────────────────────────────────────
  "Disable Telemetry & Data Collection": {
    requiresAdmin: true,
    enable: `Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DiagTrack -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name dmwappushservice -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f
schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Disable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable 2>$null`,
    disable: `Set-Service -Name DiagTrack -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Automatic -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 3 /f
schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Enable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Enable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Enable 2>$null`,
  },

  "Disable Advertising ID": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 0 /f`,
  },

  "Disable Activity History & Timeline": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 1 /f`,
  },

  "Disable Customer Experience Improvement Program": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /t REG_DWORD /d 0 /f
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable 2>$null`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /t REG_DWORD /d 1 /f
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Enable 2>$null
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Enable 2>$null`,
  },

  "Disable Windows Error Reporting": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f
Set-Service -Name WerSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WerSvc -ErrorAction SilentlyContinue`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 0 /f
Set-Service -Name WerSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Clipboard History & Cloud Sync": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 1 /f`,
  },

  "Disable Start Menu Suggestions & Tips": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353694Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353696Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353694Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353696Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /t REG_DWORD /d 1 /f`,
  },

  "Maximum Performance Power Plan": {
    requiresAdmin: true,
    enable: `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
powercfg -setactive e9a42b02-d5df-448d-aa00-03f14749eb61`,
    disable: `powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`,
  },

  "Disable SuperFetch / SysMain": {
    requiresAdmin: true,
    enable: `Set-Service -Name SysMain -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name SysMain -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name SysMain -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name SysMain -ErrorAction SilentlyContinue`,
  },

  "Disable NTFS Access Timestamps": {
    requiresAdmin: true,
    enable: `fsutil behavior set disablelastaccess 1`,
    disable: `fsutil behavior set disablelastaccess 0`,
  },

  "Disable Windows Performance Counters": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Perflib" /v "Disable Performance Counters" /t REG_DWORD /d 4 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Perflib" /v "Disable Performance Counters" /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows File Indexing": {
    requiresAdmin: true,
    enable: `Set-Service -Name WSearch -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WSearch -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name WSearch -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name WSearch -ErrorAction SilentlyContinue`,
  },

  "Disable Multiplane Overlay (MPO)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v OverlayTestMode /t REG_DWORD /d 5 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v OverlayTestMode /t REG_DWORD /d 0 /f`,
  },

  "Disable Hibernation": {
    requiresAdmin: true,
    enable: `powercfg /hibernate off
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f`,
    disable: `powercfg /hibernate on
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 1 /f`,
  },

  "Optimize Visual Effects for Performance": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 0 /f`,
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
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseSensitivity /t REG_SZ /d "10" /f`,
    disable: `reg add "HKCU\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d "1" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d "6" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "10" /f`,
  },

  "Keep All CPU Cores Active (Unpark Cores)": {
    requiresAdmin: true,
    enable: `powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100
powercfg -setacvalueindex scheme_current sub_processor CPMAXCORES 100
powercfg -setdcvalueindex scheme_current sub_processor CPMINCORES 100
powercfg -setdcvalueindex scheme_current sub_processor CPMAXCORES 100
powercfg -setactive scheme_current`,
    disable: `powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 0
powercfg -setdcvalueindex scheme_current sub_processor CPMINCORES 0
powercfg -setacvalueindex scheme_current sub_processor CPMAXCORES 100
powercfg -setdcvalueindex scheme_current sub_processor CPMAXCORES 100
powercfg -setactive scheme_current`,
  },

  "Win32 Priority Separation": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 36 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 38 /f`,
  },

  "Minimum Priority for Background Processes": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 14 /f`,
  },

  "Disable Network Power Saving": {
    requiresAdmin: true,
    enable: `Get-NetAdapter | ForEach-Object {
    Disable-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket -WakeOnPattern -ErrorAction SilentlyContinue
}`,
    disable: `Get-NetAdapter | ForEach-Object {
    Enable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue
}`,
  },

  "Disable GameBar": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v UseNexusForGameBarEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f`,
  },

  "Disable GameBar Background Recording": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_DSEBehavior /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 1 /f`,
  },

  "Optimize for Windowed & Borderless Games": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v DirectXUserGlobalSettings /t REG_SZ /d "SwapEffectUpgradeEnable=1;" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v DirectXUserGlobalSettings /t REG_SZ /d "" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /t REG_DWORD /d 0 /f`,
  },

  "Enable Game Mode": {
    enable: `reg add "HKCU\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v AllowAutoGameMode /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 0 /f`,
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
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 10 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 10 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 0xFFFFFFFF /f
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
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "True" /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /t REG_DWORD /d 2 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_HonorUserFSEBehaviorMode /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_DXGIHonorFSEWindowsCompatible /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_EFSEFeatureFlags /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /t REG_DWORD /d 2 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "Medium" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "Normal" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /t REG_SZ /d "True" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "False" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Affinity /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Clock Rate" /t REG_DWORD /d 10000 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_HonorUserFSEBehaviorMode /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_DXGIHonorFSEWindowsCompatible /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_EFSEFeatureFlags /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f`,
  },

  "CPU Priority for Games": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 6 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f`,
  },

  "High Scheduling Category for Gaming": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "Medium" /f`,
  },

  "Fortnite Process High Priority": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 2 /f`,
  },

  "Disable Dynamic Tick": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `bcdedit /set disabledynamictick yes`,
    disable: `bcdedit /set disabledynamictick no`,
  },

  "Disable Nagle's Algorithm": {
    requiresAdmin: true,
    enable: `$interfaces = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
foreach ($iface in $interfaces) {
    Set-ItemProperty -Path $iface.PSPath -Name TcpAckFrequency -Value 1 -Type DWORD -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $iface.PSPath -Name TCPNoDelay -Value 1 -Type DWORD -Force -ErrorAction SilentlyContinue
}`,
    disable: `$interfaces = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
foreach ($iface in $interfaces) {
    Set-ItemProperty -Path $iface.PSPath -Name TcpAckFrequency -Value 0 -Type DWORD -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $iface.PSPath -Name TCPNoDelay -Value 0 -Type DWORD -Force -ErrorAction SilentlyContinue
}`,
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

  "Disable IPv6": {
    requiresAdmin: true,
    enable: `Disable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0xFF /f`,
    disable: `Enable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f`,
  },

  "Prefer IPv4 over IPv6": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0x20 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f`,
  },

  "Enable SSD TRIM Optimization": {
    requiresAdmin: true,
    enable: `fsutil behavior set DisableDeleteNotify 0`,
    disable: `fsutil behavior set DisableDeleteNotify 1`,
  },

  "Disable Web Search in Windows Search": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v CortanaConsent /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows TCP Auto-Tuning": {
    requiresAdmin: true,
    enable: `netsh int tcp set global autotuninglevel=disabled`,
    disable: `netsh int tcp set global autotuninglevel=normal`,
  },

  "Disable Startup Program Delay": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 10000 /f`,
  },

  "Disable Windows Automatic Maintenance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" /v MaintenanceDisabled /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" /v MaintenanceDisabled /t REG_DWORD /d 0 /f`,
  },

  "Disable Power Throttling": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 0 /f`,
  },

  "Debloat Microsoft Edge": {
    requiresAdmin: true,
    enable: `# === Annoyances ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutoImportAtFirstRun /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PersonalizationReportingEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SpotlightExperiencesAndRecommendationsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeEssentialsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v DefaultBrowserSettingEnabled /t REG_DWORD /d 0 /f
# === Features / Bloat ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v FollowCreatorsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HubsSidebarEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v StandaloneHubsSidebarEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SmartScreenEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SyncDisabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SessionCrashBubbleEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeShoppingAssistantEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ShowMicrosoftRewards /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v MiniMenuEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ImplicitSignInEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeCollectionsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SplitScreenEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v UserFeedbackAllowed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v WebWidgetAllowed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v StartupBoostEnabled /t REG_DWORD /d 0 /f
# === New Tab Page ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPagePrerenderEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageQuickLinksEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageBackgroundEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageContentEnabled /t REG_DWORD /d 0 /f
# === Additional ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v TrackingPrevention /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PromotionalTabsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillCreditCardEnabled /t REG_DWORD /d 0 /f`,
    disable: `# === Annoyances — restore defaults ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutoImportAtFirstRun /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PersonalizationReportingEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SpotlightExperiencesAndRecommendationsEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeEssentialsEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v DefaultBrowserSettingEnabled /t REG_DWORD /d 1 /f
# === Features / Bloat — restore defaults ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v FollowCreatorsEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HubsSidebarEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v StandaloneHubsSidebarEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SmartScreenEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SyncDisabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SessionCrashBubbleEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeShoppingAssistantEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ShowMicrosoftRewards /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v MiniMenuEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ImplicitSignInEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeCollectionsEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SplitScreenEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v UserFeedbackAllowed /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v WebWidgetAllowed /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v StartupBoostEnabled /t REG_DWORD /d 1 /f
# === New Tab Page — restore defaults ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPagePrerenderEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageQuickLinksEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageBackgroundEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v NewTabPageContentEnabled /t REG_DWORD /d 1 /f
# === Additional — restore defaults ===
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v TrackingPrevention /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PromotionalTabsEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillCreditCardEnabled /t REG_DWORD /d 1 /f`,
  },

  "Debloat Google Chrome": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v HardwareAccelerationModeEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v BackgroundModeEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v MetricsReportingEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v ChromeCleanupEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v MediaRouterCastAllowAllIPs /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v HardwareAccelerationModeEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v BackgroundModeEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v MetricsReportingEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v ChromeCleanupEnabled /t REG_DWORD /d 1 /f`,
  },

  "Debloat Opera GX": {
    enable: `# Opera GX: Disable hardware acceleration and sounds via Preferences file (UTF-8 safe)
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $pref.system) { $pref | Add-Member -Force -NotePropertyName "system" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.system | Add-Member -Force -NotePropertyName "hardware_acceleration_mode_previous" -NotePropertyValue $false
    if (-not $pref.gx_corner) { $pref | Add-Member -Force -NotePropertyName "gx_corner" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.gx_corner | Add-Member -Force -NotePropertyName "sounds_enabled" -NotePropertyValue $false
    $pref | ConvertTo-Json -Depth 100 | Set-Content $operaGxPath -Encoding UTF8
}`,
    disable: `# Opera GX: Restore hardware acceleration and sounds
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $pref.system) { $pref | Add-Member -Force -NotePropertyName "system" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.system | Add-Member -Force -NotePropertyName "hardware_acceleration_mode_previous" -NotePropertyValue $true
    if (-not $pref.gx_corner) { $pref | Add-Member -Force -NotePropertyName "gx_corner" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.gx_corner | Add-Member -Force -NotePropertyName "sounds_enabled" -NotePropertyValue $true
    $pref | ConvertTo-Json -Depth 100 | Set-Content $operaGxPath -Encoding UTF8
}`,
  },

  "Disable Windows Copilot & AI Features": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowCopilotButton /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v DisableAIDataAnalysis /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v AllowRecallEnablement /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v EnableAIImageCreator /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowCopilotButton /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v DisableAIDataAnalysis /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v AllowRecallEnablement /t REG_DWORD /d 1 /f`,
  },

  "Disable Lock Screen Suggestions & Ads": {
    enable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /t REG_DWORD /d 1 /f`,
  },

  "Disable Remote Assistance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowToGetHelp /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowFullControl /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowToGetHelp /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowFullControl /t REG_DWORD /d 1 /f`,
  },

  "Disable Phone Link & Mobile Sync": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /t REG_DWORD /d 1 /f`,
  },

  // ── PERFORMANCE (Cortex Disk Cache & Desktop Menu) ─────────────────────────

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
    enable: `schtasks /Change /TN "Microsoft\\Windows\\Defrag\\ScheduledDefrag" /Disable 2>$null
reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v OptimizeComplete /t REG_SZ /d "No" /f 2>$null`,
    disable: `schtasks /Change /TN "Microsoft\\Windows\\Defrag\\ScheduledDefrag" /Enable 2>$null`,
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

  "Release Unused DLLs from Memory": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v AlwaysUnloadDLL /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v AlwaysUnloadDLL /t REG_DWORD /d 0 /f`,
  },

  "Svchost Process Isolation": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `$ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1KB
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d $ram /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d 380000 /f`,
  },

  "Disable 8.3 Short File Names": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 0 /f`,
  },

  "Optimize Boot Configuration": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "Y" /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnablePrefetcher /t REG_DWORD /d 3 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnableSuperfetch /t REG_DWORD /d 3 /f 2>$null`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "N" /f`,
  },

  "Increase System I/O Performance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /t REG_DWORD /d 983040 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /t REG_DWORD /d 0 /f`,
  },

  // ── SYSTEM (Cortex Desktop Menu & Network Optimization) ───────────────────

  "Speed Up System Shutdown": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v WaitToKillServiceTimeout /t REG_SZ /d "2000" /f
reg add "HKCU\\Control Panel\\Desktop" /v WaitToKillAppTimeout /t REG_SZ /d "2000" /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v WaitToKillServiceTimeout /t REG_SZ /d "5000" /f
reg add "HKCU\\Control Panel\\Desktop" /v WaitToKillAppTimeout /t REG_SZ /d "20000" /f`,
  },

  "Disable Taskbar & Menu Animations": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 0 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d "0" /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAnimations /t REG_DWORD /d 1 /f
reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d "1" /f`,
  },

  "Disable Startup Disk Check": {
    requiresAdmin: true,
    enable: `# Exclude all drive letters from automatic chkdsk on next boot
chkntfs /x C: D: E: F: G: H: I: J: K: L: 2>$null`,
    disable: `# Restore default automatic chkdsk behaviour
chkntfs /d 2>$null`,
  },

  "Reduce Taskbar Preview Delay": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ExtendedUIHoverTime /t REG_DWORD /d 100 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ThumbnailLivePreviewHoverTime /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ExtendedUIHoverTime /t REG_DWORD /d 400 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ThumbnailLivePreviewHoverTime /t REG_DWORD /d 500 /f`,
  },

  "Disable AutoPlay for External Devices": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 145 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 145 /f`,
  },

  "Disable Notification Center": {
    enable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /t REG_DWORD /d 1 /f
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

  "Increase Network Buffer Size": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SizReqBuf /t REG_DWORD /d 65535 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v IRPStackSize /t REG_DWORD /d 20 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SizReqBuf /t REG_DWORD /d 4356 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v IRPStackSize /t REG_DWORD /d 15 /f`,
  },

  "Optimize TCP/IP Network Stack": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v DefaultTTL /t REG_DWORD /d 64 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUBHDetect /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v SackOpts /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 5 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v Tcp1323Opts /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v DefaultTTL /t REG_DWORD /d 128 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUBHDetect /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v SackOpts /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 5 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v Tcp1323Opts /t REG_DWORD /d 0 /f`,
  },

  "Optimize DNS Resolution": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheEntryTtlLimit /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxSOACacheEntryTtlLimit /t REG_DWORD /d 300 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheTtl /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxNegativeCacheTtl /t REG_DWORD /d 5 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheEntryTtlLimit /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxSOACacheEntryTtlLimit /t REG_DWORD /d 300 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheTtl /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxNegativeCacheTtl /t REG_DWORD /d 300 /f`,
  },

  "Unlock Reserved Network Bandwidth": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 20 /f`,
  },

  "Increase Browser Connection Limits": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v MaxConnectionsPerServer /t REG_DWORD /d 16 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v MaxConnectionsPer1_0Server /t REG_DWORD /d 16 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v MaxConnectionsPerServer /t REG_DWORD /d 2 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v MaxConnectionsPer1_0Server /t REG_DWORD /d 2 /f`,
  },

  // ── SERVICES (Windows Service Optimization) ───────────────────────────────

  "Disable BranchCache (PeerDistSvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name PeerDistSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name PeerDistSvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name PeerDistSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable iSCSI Initiator (MSiSCSI)": {
    requiresAdmin: true,
    enable: `Set-Service -Name MSiSCSI -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name MSiSCSI -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name MSiSCSI -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable SNMP Trap (SNMPTRAP)": {
    requiresAdmin: true,
    enable: `Set-Service -Name SNMPTRAP -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name SNMPTRAP -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name SNMPTRAP -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Certificate Propagation (CertPropSvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name CertPropSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name CertPropSvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name CertPropSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable ActiveX Installer (AxInstSV)": {
    requiresAdmin: true,
    enable: `Set-Service -Name AxInstSV -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name AxInstSV -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name AxInstSV -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Application Management (AppMgmt)": {
    requiresAdmin: true,
    enable: `Set-Service -Name AppMgmt -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name AppMgmt -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name AppMgmt -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Remote Registry (RemoteRegistry)": {
    requiresAdmin: true,
    enable: `Set-Service -Name RemoteRegistry -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name RemoteRegistry -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name RemoteRegistry -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Smart Card Removal Policy (SCPolicySvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name SCPolicySvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name SCPolicySvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name SCPolicySvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable WebDAV Client (WebClient)": {
    requiresAdmin: true,
    enable: `Set-Service -Name WebClient -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WebClient -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name WebClient -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Windows Remote Management (WinRM)": {
    requiresAdmin: true,
    enable: `Set-Service -Name WinRM -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WinRM -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name WinRM -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Offline Files (CscService)": {
    requiresAdmin: true,
    enable: `Set-Service -Name CscService -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name CscService -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name CscService -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Peer Name Resolution (PNRPsvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name PNRPsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name PNRPsvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name PNRPsvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Peer Networking (p2psvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name p2psvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name p2psvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name p2psvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Peer Networking Identity (p2pimsvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name p2pimsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name p2pimsvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name p2pimsvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Optimize Discord for Gaming": {
    requiresAdmin: true,
    enable: `# Set Discord to Below Normal CPU priority via IFEO
# This only takes effect when CPU is contested — Discord yields to your game
# Voice/audio threads are managed by Windows audio system and are unaffected by this
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 2 /f
# Disable hardware acceleration and in-game overlay in Discord's settings.json
# Restart Discord after applying for changes to take effect
$discordCfg = "$env:APPDATA\\discord\\settings.json"
if (Test-Path $discordCfg) {
    $cfg = Get-Content $discordCfg -Raw -Encoding UTF8 | ConvertFrom-Json
    $cfg | Add-Member -Force -NotePropertyName "enableHardwareAcceleration" -NotePropertyValue $false
    $cfg | Add-Member -Force -NotePropertyName "OVERLAY" -NotePropertyValue $false
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $discordCfg -Encoding UTF8
}`,
    disable: `# Restore Discord to Normal CPU priority
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f
# Restore hardware acceleration and overlay in Discord's settings.json
$discordCfg = "$env:APPDATA\\discord\\settings.json"
if (Test-Path $discordCfg) {
    $cfg = Get-Content $discordCfg -Raw -Encoding UTF8 | ConvertFrom-Json
    $cfg | Add-Member -Force -NotePropertyName "enableHardwareAcceleration" -NotePropertyValue $true
    $cfg | Add-Member -Force -NotePropertyName "OVERLAY" -NotePropertyValue $true
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $discordCfg -Encoding UTF8
}`,
  },

  // ── NETWORK ────────────────────────────────────────────────────────────────
  "Disable NetBIOS over TCP/IP": {
    requiresAdmin: true,
    enable: `# Disable NetBIOS over TCP/IP on all adapters via WMI (0=EnableViaDhcp, 1=Enabled, 2=Disabled)
$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
foreach ($a in $adapters) { $a.SetTCPIPNetBIOS(2) 2>$null }
# Also set registry key for all NetBT interfaces (persists for new adapters)
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Interfaces" -ErrorAction SilentlyContinue | ForEach-Object {
  Set-ItemProperty -Path $_.PSPath -Name NetbiosOptions -Value 2 -ErrorAction SilentlyContinue
}`,
    disable: `$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
foreach ($a in $adapters) { $a.SetTCPIPNetBIOS(0) 2>$null }
Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Interfaces" -ErrorAction SilentlyContinue | ForEach-Object {
  Set-ItemProperty -Path $_.PSPath -Name NetbiosOptions -Value 0 -ErrorAction SilentlyContinue
}`,
  },

  "Disable SMBv1 Protocol": {
    requiresAdmin: true,
    enable: `Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force -ErrorAction SilentlyContinue
Set-SmbClientConfiguration -EnableBandwidthThrottling 0 -EnableLargeMtu 1 -Force -ErrorAction SilentlyContinue
Disable-WindowsOptionalFeature -Online -FeatureName smb1protocol -NoRestart -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /t REG_DWORD /d 0 /f`,
    disable: `Set-SmbServerConfiguration -EnableSMB1Protocol $true -Force -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /t REG_DWORD /d 1 /f`,
    requiresRestart: true,
  },

  "Disable Large Send Offload (LSO)": {
    requiresAdmin: true,
    enable: `# Disable LSO v1 and v2 on all physical adapters
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  $name = $_.Name
  Disable-NetAdapterLso -Name $name -ErrorAction SilentlyContinue
  Set-NetAdapterAdvancedProperty -Name $name -DisplayName "Large Send Offload V2 (IPv4)" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
  Set-NetAdapterAdvancedProperty -Name $name -DisplayName "Large Send Offload V2 (IPv6)" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
}`,
    disable: `Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  $name = $_.Name
  Enable-NetAdapterLso -Name $name -ErrorAction SilentlyContinue
  Set-NetAdapterAdvancedProperty -Name $name -DisplayName "Large Send Offload V2 (IPv4)" -DisplayValue "Enabled" -ErrorAction SilentlyContinue
  Set-NetAdapterAdvancedProperty -Name $name -DisplayName "Large Send Offload V2 (IPv6)" -DisplayValue "Enabled" -ErrorAction SilentlyContinue
}`,
  },

  "Enable Receive Side Scaling (RSS)": {
    requiresAdmin: true,
    enable: `netsh int tcp set global rss=enabled 2>$null
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  Enable-NetAdapterRss -Name $_.Name -ErrorAction SilentlyContinue
}`,
    disable: `netsh int tcp set global rss=disabled 2>$null
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  Disable-NetAdapterRss -Name $_.Name -ErrorAction SilentlyContinue
}`,
  },

  "Disable Delivery Optimization Service": {
    requiresAdmin: true,
    enable: `Set-Service -Name DoSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DoSvc -Force -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f`,
    disable: `Set-Service -Name DoSvc -StartupType Automatic -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 3 /f`,
  },

  "Disable Windows Connect Now (wcncsvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name wcncsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name wcncsvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name wcncsvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable LLMNR Protocol": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" /v EnableMulticast /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" /v EnableMulticast /t REG_DWORD /d 1 /f`,
  },

  "Disable mDNS Multicast": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableMDNS /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableMDNS /t REG_DWORD /d 1 /f`,
  },

  // ── SERVICES (additional) ──────────────────────────────────────────────────
  "Disable Print Spooler (Spooler)": {
    requiresAdmin: true,
    enable: `Set-Service -Name Spooler -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name Spooler -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name Spooler -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name Spooler -ErrorAction SilentlyContinue`,
  },

  "Disable Fax Service (Fax)": {
    requiresAdmin: true,
    enable: `Set-Service -Name Fax -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name Fax -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name Fax -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Distributed Link Tracking (TrkWks)": {
    requiresAdmin: true,
    enable: `Set-Service -Name TrkWks -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name TrkWks -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name TrkWks -StartupType Automatic -ErrorAction SilentlyContinue`,
  },

  "Disable Program Compatibility Assistant (PcaSvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name PcaSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name PcaSvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name PcaSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Touch Keyboard Service (TabletInputService)": {
    requiresAdmin: true,
    enable: `Set-Service -Name TabletInputService -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name TabletInputService -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name TabletInputService -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Windows Insider Service (wisvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name wisvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name wisvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name wisvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  // ── GAMING (additional) ────────────────────────────────────────────────────
  "Disable Teredo IPv6 Tunneling": {
    requiresAdmin: true,
    enable: `netsh interface teredo set state disabled 2>$null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 1 /f`,
    disable: `netsh interface teredo set state default 2>$null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f`,
  },

  "Disable HPET (Platform Clock)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `bcdedit /set useplatformclock false 2>$null
bcdedit /set uselegacyapicmode No 2>$null`,
    disable: `bcdedit /deletevalue useplatformclock 2>$null
bcdedit /deletevalue uselegacyapicmode 2>$null`,
  },

  "Disable Auto-Restart After Windows Updates": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 4 /f`,
  },

  // ── NETWORK (additional) ───────────────────────────────────────────────────
  "Disable 6to4 & ISATAP Tunneling": {
    requiresAdmin: true,
    enable: `netsh interface 6to4 set state disabled 2>$null
netsh interface isatap set state disabled 2>$null`,
    disable: `netsh interface 6to4 set state default 2>$null
netsh interface isatap set state default 2>$null`,
  },

  // ── SERVICES (additional) ──────────────────────────────────────────────────
  "Disable IP Helper Service (iphlpsvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name iphlpsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name iphlpsvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name iphlpsvc -StartupType Automatic -ErrorAction SilentlyContinue`,
  },

  "Disable Diagnostic Policy Service (DPS)": {
    requiresAdmin: true,
    enable: `Set-Service -Name DPS -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DPS -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name DPS -StartupType Automatic -ErrorAction SilentlyContinue`,
  },

  "Disable Connected Devices Platform (CDPSvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name CDPSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name CDPSvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name CDPSvc -StartupType Automatic -ErrorAction SilentlyContinue`,
  },

  // ── PERFORMANCE (additional) ───────────────────────────────────────────────
  "Clear Page File on Shutdown": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v ClearPageFileAtShutdown /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v ClearPageFileAtShutdown /t REG_DWORD /d 0 /f`,
  },

  "Disable Transparency Effects": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 1 /f`,
  },

  // ── GAMING (Razer Cortex Speed Up style) ──────────────────────────────────

  "Disable USB Selective Suspend": {
    requiresAdmin: true,
    enable: `# Disable USB Selective Suspend on active power plan (AC + DC)
$usbGuid = "2a737441-1930-4402-8d77-b2bebba308a3"
$usbSub  = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
powercfg /SETACVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 0 2>$null
powercfg /SETDCVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 0 2>$null
powercfg /apply 2>$null`,
    disable: `$usbGuid = "2a737441-1930-4402-8d77-b2bebba308a3"
$usbSub  = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
powercfg /SETACVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 1 2>$null
powercfg /SETDCVALUEINDEX SCHEME_CURRENT $usbGuid $usbSub 1 2>$null
powercfg /apply 2>$null`,
  },

  "Set TSC Sync Policy (Precise Game Timing)": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `bcdedit /set tscsyncpolicy Enhanced 2>$null`,
    disable: `bcdedit /deletevalue tscsyncpolicy 2>$null`,
  },

  "Disable GameInput Service (gaminputsvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name gaminputsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name gaminputsvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name gaminputsvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  // ── NETWORK (Razer Cortex Speed Up style) ─────────────────────────────────

  "Enable TCP Fast Open": {
    requiresAdmin: true,
    enable: `netsh int tcp set global fastopen=enabled 2>$null
netsh int tcp set global fastopenfallback=enabled 2>$null`,
    disable: `netsh int tcp set global fastopen=disabled 2>$null
netsh int tcp set global fastopenfallback=disabled 2>$null`,
  },

  "Disable NIC Interrupt Moderation": {
    requiresAdmin: true,
    enable: `# Disable Interrupt Moderation on all physical adapters
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  $n = $_.Name
  Set-NetAdapterAdvancedProperty -Name $n -RegistryKeyword "*InterruptModeration" -RegistryValue 0 -ErrorAction SilentlyContinue
  Set-NetAdapterAdvancedProperty -Name $n -DisplayName "Adaptive Inter-Frame Spacing" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
}`,
    disable: `Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*InterruptModeration" -RegistryValue 1 -ErrorAction SilentlyContinue
}`,
  },

  // ── SERVICES (Windows Service Optimization) ────────────────────────────────

  "Disable Secondary Logon (seclogon)": {
    requiresAdmin: true,
    enable: `Set-Service -Name seclogon -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name seclogon -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name seclogon -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable WMI Performance Adapter (wmiApSrv)": {
    requiresAdmin: true,
    enable: `Set-Service -Name wmiApSrv -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name wmiApSrv -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name wmiApSrv -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable TCP/IP NetBIOS Helper (lmhosts)": {
    requiresAdmin: true,
    enable: `Set-Service -Name lmhosts -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name lmhosts -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name lmhosts -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Telephony Service (TapiSrv)": {
    requiresAdmin: true,
    enable: `Set-Service -Name TapiSrv -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name TapiSrv -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name TapiSrv -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Still Image Service (StiSvc)": {
    requiresAdmin: true,
    enable: `Set-Service -Name StiSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name StiSvc -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name StiSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Bluetooth Support Service (bthserv)": {
    requiresAdmin: true,
    enable: `Set-Service -Name bthserv -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name bthserv -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name bthserv -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Net.TCP Port Sharing (NetTcpPortSharing)": {
    requiresAdmin: true,
    enable: `Set-Service -Name NetTcpPortSharing -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name NetTcpPortSharing -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name NetTcpPortSharing -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Remote Access Manager (RasMan)": {
    requiresAdmin: true,
    enable: `Set-Service -Name RasMan -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name RasMan -Force -ErrorAction SilentlyContinue`,
    disable: `Set-Service -Name RasMan -StartupType Manual -ErrorAction SilentlyContinue`,
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

  lines.push('Write-Host "" ');
  lines.push(`Write-Host "Done! ${active.length} tweaks applied." -ForegroundColor Green`);

  if (needsRestart) {
    lines.push(
      'Write-Host "RESTART REQUIRED for some changes to take effect." -ForegroundColor Red'
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

  lines.push('Write-Host "" ');
  lines.push(`Write-Host "Done! ${reversible.length} tweaks reverted to defaults." -ForegroundColor Green`);
  lines.push('Write-Host "RESTART RECOMMENDED for all changes to take effect." -ForegroundColor Red');

  return lines.join("\n");
}
