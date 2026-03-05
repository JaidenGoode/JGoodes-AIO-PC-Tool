// PowerShell commands for each tweak (by title match)
// All commands require running as Administrator in PowerShell

export interface TweakCommand {
  enable: string;
  disable: string;
  requiresRestart?: boolean;
  requiresAdmin?: boolean;
}

export const TWEAK_COMMANDS: Record<string, TweakCommand> = {
  "Debloat Windows": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `# Remove OneDrive
taskkill /f /im OneDrive.exe 2>nul
Start-Sleep -Milliseconds 500
$oneDrivePaths = @(
  "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe",
  "$env:SystemRoot\\System32\\OneDriveSetup.exe",
  "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDriveSetup.exe"
)
foreach ($p in $oneDrivePaths) { if (Test-Path $p) { & $p /uninstall 2>nul; break } }
# Disable Consumer Features & Telemetry
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f
# Disable Widgets
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f
# Enable End Task from Taskbar
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v TaskbarEndTask /t REG_DWORD /d 1 /f
# Show hidden files
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Hidden /t REG_DWORD /d 1 /f
# Disable Storage Sense
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v AllowStorageSenseGlobal /t REG_DWORD /d 0 /f
# Disable Sticky Keys
reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v Flags /t REG_SZ /d "506" /f
# Set non-essential services to manual
@("DiagTrack","dmwappushservice","WMPNetworkSvc","WerSvc") | ForEach-Object { Set-Service -Name $_ -StartupType Manual -ErrorAction SilentlyContinue }`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /f 2>nul`,
  },

  "Disable Telemetry & Data Collection": {
    requiresAdmin: true,
    enable: `Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DiagTrack -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name dmwappushservice -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f
schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Disable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable 2>nul`,
    disable: `Set-Service -Name DiagTrack -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Automatic -ErrorAction SilentlyContinue
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /f 2>nul`,
  },

  "Disable Advertising ID": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 1 /f`,
    disable: `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /f 2>nul`,
  },

  "Disable Activity History & Timeline": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /f 2>nul`,
  },

  "Disable Customer Experience Improvement Program": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /t REG_DWORD /d 0 /f
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable 2>nul`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /f 2>nul`,
  },

  "Disable Windows Error Reporting": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f
Set-Service -Name WerSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WerSvc -ErrorAction SilentlyContinue`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /f 2>nul
Set-Service -Name WerSvc -StartupType Manual -ErrorAction SilentlyContinue`,
  },

  "Disable Clipboard History & Cloud Sync": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /f 2>nul`,
  },

  "Disable Start Menu Suggestions & Tips": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353694Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353696Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /f 2>nul`,
  },

  "Maximum Performance Power Plan": {
    requiresAdmin: true,
    enable: `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>nul
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
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Perflib" /v "Disable Performance Counters" /f 2>nul`,
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
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v OverlayTestMode /f 2>nul`,
  },

  "Disable Hibernation": {
    requiresAdmin: true,
    enable: `powercfg /hibernate off
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f`,
    disable: `powercfg /hibernate on
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 1 /f`,
  },

  "Disable Background Apps (Legacy)": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsRunInBackground /t REG_DWORD /d 2 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsRunInBackground /f 2>nul`,
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
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /f 2>nul`,
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
    disable: `powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 5
powercfg -setdcvalueindex scheme_current sub_processor CPMINCORES 5
powercfg -setactive scheme_current`,
  },

  "Minimum Priority for Background Processes": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 38 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 2 /f`,
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
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /f 2>nul
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
    enable: `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v DirectXUserGlobalSettings /t REG_SZ /d "SwapEffectUpgradeEnable=1;" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /t REG_DWORD /d 2 /f`,
    disable: `reg delete "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v DirectXUserGlobalSettings /f 2>nul
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /f 2>nul`,
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
    disable: `reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /f 2>nul`,
  },

  "System Responsiveness & Network Throttling": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 10 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 10 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /f 2>nul
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v SystemResponsiveness /f 2>nul`,
  },

  "GPU & CPU Priority for Games": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 6 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "True" /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f`,
  },

  "Fortnite Process High Priority": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe" /f 2>nul`,
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
    Remove-ItemProperty -Path $iface.PSPath -Name TcpAckFrequency -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $iface.PSPath -Name TCPNoDelay -Force -ErrorAction SilentlyContinue
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
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /f 2>nul`,
  },

  "Prefer IPv4 over IPv6": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0x20 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /f 2>nul`,
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
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /f 2>nul`,
  },

  "Disable Windows TCP Auto-Tuning": {
    requiresAdmin: true,
    enable: `netsh int tcp set global autotuninglevel=disabled`,
    disable: `netsh int tcp set global autotuninglevel=normal`,
  },

  "Disable Startup Program Delay": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /f 2>nul`,
  },

  "Disable Windows Automatic Maintenance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" /v MaintenanceDisabled /t REG_DWORD /d 1 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" /v MaintenanceDisabled /f 2>nul`,
  },

  "Disable Power Throttling": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 1 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /f 2>nul`,
  },

  "Debloat Microsoft Edge": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HubsSidebarEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v TrackingPrevention /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PersonalizationReportingEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ShowMicrosoftRewards /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PromotionalTabsEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillCreditCardEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SpellcheckEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /f 2>nul`,
  },

  "Debloat Google Chrome": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v BackgroundModeEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v MetricsReportingEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v ChromeCleanupEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /v MediaRouterCastAllowAllIPs /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" /f 2>nul`,
  },

  "Debloat Opera GX": {
    enable: `reg add "HKCU\\Software\\Opera Software" /v "Last Speed Dial Sync" /t REG_SZ /d "" /f
# Opera GX: Disable hardware acceleration via settings file
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath | ConvertFrom-Json
    $pref.hardware_acceleration_mode_previous = $false
    $pref | ConvertTo-Json -Depth 100 | Set-Content $operaGxPath
}`,
    disable: `# Re-enable Opera GX hardware acceleration
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath | ConvertFrom-Json
    $pref.hardware_acceleration_mode_previous = $true
    $pref | ConvertTo-Json -Depth 100 | Set-Content $operaGxPath
}`,
  },

  "Optimize Discord for Gaming": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 2 /f
# Disable Discord overlay via config file
$discordCfg = "$env:APPDATA\\discord\\settings.json"
if (Test-Path $discordCfg) {
    $cfg = Get-Content $discordCfg | ConvertFrom-Json
    $cfg | Add-Member -Force -NotePropertyName "enableHardwareAcceleration" -NotePropertyValue $false
    $cfg | Add-Member -Force -NotePropertyName "IS_MAXIMIZED" -NotePropertyValue $false
    $cfg | ConvertTo-Json | Set-Content $discordCfg
}`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe" /f 2>nul`,
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

  lines.push('Write-Host "Press any key to exit..." -ForegroundColor Gray');
  lines.push("$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')");

  return lines.join("\n");
}
