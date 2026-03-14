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
rem Smooth edges of screen fonts stays ON
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
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "0" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseSensitivity /t REG_SZ /d "10" /f`,
    disable: `reg add "HKCU\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d "1" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d "6" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d "10" /f
reg add "HKCU\\Control Panel\\Mouse" /v MouseSensitivity /t REG_SZ /d "10" /f`,
  },

  "Keep All CPU Cores Active (Unpark Cores)": {
    requiresAdmin: true,
    // Enable: set ValueMax=0 and ValueMin=0 — forces all cores to 100% capacity, bypassing core parking
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583" /v ValueMax /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583" /v ValueMin /t REG_DWORD /d 0 /f
powercfg /setactive scheme_current`,
    // Revert: ValueMax=100 (0x64 hex) re-enables core parking, ValueMin=0 — Windows default
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583" /v ValueMax /t REG_DWORD /d 100 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583" /v ValueMin /t REG_DWORD /d 0 /f
powercfg /setactive scheme_current`,
  },

  "Win32 Priority Separation": {
    requiresAdmin: true,
    // Windows default: 0x26 (38 decimal) = variable quanta, short foreground boost — the correct Win10/11 default.
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 36 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 38 /f`,
  },

  "Disable Background UWP Apps": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 0 /f`,
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
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\GameBar" /v UseNexusForGameBarEnabled /t REG_DWORD /d 1 /f`,
  },

  "Disable GameBar Background Recording": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_DSEBehavior /t REG_DWORD /d 2 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 1 /f
reg add "HKCU\\System\\GameConfigStore" /v GameDVR_DSEBehavior /t REG_DWORD /d 0 /f`,
  },

  "Optimize for Windowed & Borderless Games": {
    requiresAdmin: true,
    enable: `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v DirectXUserGlobalSettings /t REG_SZ /d "SwapEffectUpgradeEnable=1;" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /t REG_DWORD /d 2 /f`,
    disable: `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences" -Name "DirectXUserGlobalSettings" -Value "" -Type String -Force -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v ForceEffectMode /t REG_DWORD /d 0 /f`,
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
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "Medium" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "Normal" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /t REG_SZ /d "True" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Latency Sensitive" /t REG_SZ /d "False" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Affinity /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Clock Rate" /t REG_DWORD /d 10000 /f`,
  },

  "Enable MSI Mode for GPU": {
    requiresAdmin: true,
    requiresRestart: true,
    enable: `# Auto-detect primary GPU and enable Message Signaled Interrupts (MSI Mode)
try {
    $gpu = Get-PnpDevice -Class Display -Status OK | Where-Object { $_.FriendlyName -notmatch 'Microsoft|Remote|Basic' } | Select-Object -First 1
    if (!$gpu) { Write-Host "No compatible GPU found."; exit 1 }
    $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\" + $gpu.InstanceId + "\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"
    if (!(Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
    reg add ("HKLM\\SYSTEM\\CurrentControlSet\\Enum\\" + $gpu.InstanceId + "\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties") /v MSISupported /t REG_DWORD /d 1 /f
    Write-Host "MSI Mode ENABLED for: $($gpu.FriendlyName)"
    Write-Host "A system restart is required for the change to take effect."
} catch { Write-Host "Error: $_" }`,
    disable: `# Auto-detect primary GPU and disable MSI Mode (revert to Windows default)
try {
    $gpu = Get-PnpDevice -Class Display -Status OK | Where-Object { $_.FriendlyName -notmatch 'Microsoft|Remote|Basic' } | Select-Object -First 1
    if (!$gpu) { Write-Host "No compatible GPU found."; exit 1 }
    reg add ("HKLM\\SYSTEM\\CurrentControlSet\\Enum\\" + $gpu.InstanceId + "\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties") /v MSISupported /t REG_DWORD /d 0 /f
    Write-Host "MSI Mode DISABLED for: $($gpu.FriendlyName). Restart required."
} catch { Write-Host "Error: $_" }`,
  },

  "High Scheduling Category for Gaming": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "Medium" /f`,
  },

  "Fortnite Process High Priority": {
    requiresAdmin: true,
    // CpuPriorityClass IFEO values: 1=Idle, 2=Below Normal, 3=Normal, 4=Above Normal, 5=High, 6=Real-time
    // IoPriority IFEO values: 0=Very Low, 1=Low, 2=Normal, 3=High
    // Revert: set back to Normal priority (CpuPriorityClass=3, IoPriority=2) — Windows default for all processes
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 5 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 2 /f`,
  },

  "Global Timer Resolution for Gaming": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" /v GlobalTimerResolutionRequests /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" /v GlobalTimerResolutionRequests /t REG_DWORD /d 0 /f`,
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
    // Revert: remove TcpAckFrequency & TCPNoDelay keys entirely — these do NOT exist by default in Windows.
    // Deleting them restores Windows built-in Nagle behavior (delayed ACK + Nagle's Algorithm enabled).
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
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f`,
  },

  "Prefer IPv4 over IPv6": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0x20 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f`,
  },

  "Enable SSD TRIM Optimization": {
    requiresAdmin: true,
    // Enable: DisableDeleteNotify=0 (TRIM on). Revert: DisableDeleteNotify=1 (TRIM off — reverses the action).
    enable: `fsutil behavior set DisableDeleteNotify 0`,
    disable: `fsutil behavior set DisableDeleteNotify 1`,
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
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "Y" /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnablePrefetcher /t REG_DWORD /d 3 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnableSuperfetch /t REG_DWORD /d 3 /f 2>$null`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "N" /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnablePrefetcher /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnableSuperfetch /t REG_DWORD /d 0 /f 2>$null`,
  },

  "Increase System I/O Performance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /t REG_DWORD /d 983040 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /t REG_DWORD /d 0 /f`,
  },

  // ── SYSTEM (Cortex Desktop Menu & Network Optimization) ───────────────────

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
    // Revert: delete the override keys to restore Windows built-in DNS cache defaults
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheEntryTtlLimit /f 2>$null
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxSOACacheEntryTtlLimit /f 2>$null
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheTtl /f 2>$null
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxNegativeCacheTtl /f 2>$null`,
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

  // ── NETWORK ────────────────────────────────────────────────────────────────
  "Disable SMBv1 Protocol": {
    requiresAdmin: true,
    // Windows default since Win10 Fall Creators Update (2017): SMBv1 disabled.
    // Revert also keeps SMBv1 disabled — this is the correct modern Windows default.
    enable: `Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force -ErrorAction SilentlyContinue
Set-SmbClientConfiguration -EnableBandwidthThrottling 0 -EnableLargeMtu 1 -Force -ErrorAction SilentlyContinue
Disable-WindowsOptionalFeature -Online -FeatureName smb1protocol -NoRestart -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /t REG_DWORD /d 0 /f`,
    disable: `Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /t REG_DWORD /d 0 /f`,
    requiresRestart: true,
  },

  "Enable Receive Side Scaling (RSS)": {
    requiresAdmin: true,
    // Enable: RSS on (distributes network packets across CPU cores). Revert: RSS off.
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
    // Three-method approach to handle protected service on all Windows 10/11 builds:
    // 1. sc.exe config (standard, may silently fail on protected builds)
    // 2. Direct registry write to Services\DoSvc Start key (bypasses protection, takes effect at next boot)
    // 3. Policy DODownloadMode=0 (HTTP-only, disables all P2P sharing even if service still runs this session)
    enable: `sc.exe stop DoSvc 2>&1 | Out-Null
sc.exe config DoSvc start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\DoSvc" /v Start /t REG_DWORD /d 4 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f`,
    disable: `sc.exe config DoSvc start= demand 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\DoSvc" /v Start /t REG_DWORD /d 3 /f
sc.exe start DoSvc 2>&1 | Out-Null
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 3 /f`,
  },

  // ── GAMING (additional) ────────────────────────────────────────────────────
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
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 0 /f`,
  },

  // ── PERFORMANCE (additional) ───────────────────────────────────────────────
  "Disable Transparency Effects": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f`,
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 1 /f`,
  },

  "Increase Gaming Task Priority in System Scheduler": {
    requiresAdmin: true,
    // Targets MMCSS Tasks\Audio — distinct from Tasks\Games (covered by "Maximum Priority for Games")
    // Windows defaults for Tasks\Audio: Priority=6, Scheduling Category=Medium, SFIO Priority=Normal, Background Only=False
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v Priority /t REG_DWORD /d 6 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "Scheduling Category" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "SFIO Priority" /t REG_SZ /d "High" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "Background Only" /t REG_SZ /d "False" /f`,
    // Revert: Priority=6 (Windows default for Audio — NOT 3), Background Only=False (audio is NOT background-only by default)
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v Priority /t REG_DWORD /d 6 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "Scheduling Category" /t REG_SZ /d "Medium" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "SFIO Priority" /t REG_SZ /d "Normal" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Audio" /v "Background Only" /t REG_SZ /d "False" /f`,
  },

  "Disable Tile Notification System": {
    requiresAdmin: false,
    enable: `reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v DisableTileNotification /t REG_DWORD /d 1 /f
reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v NoTileApplicationNotification /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v DisableTileNotification /t REG_DWORD /d 0 /f
reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v NoTileApplicationNotification /t REG_DWORD /d 0 /f`,
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

  // ── NETWORK (Razer Cortex Speed Up style) ─────────────────────────────────

  "Enable TCP Fast Open": {
    requiresAdmin: true,
    // fastopenfallback is not a recognized global parameter on many Windows builds — use fastopen only
    // Windows default: fastopen=disabled; revert restores the Windows default
    enable: `netsh int tcp set global fastopen=enabled 2>$null`,
    disable: `netsh int tcp set global fastopen=disabled 2>$null`,
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

  "Disable Windows Error Reporting": {
    requiresAdmin: true,
    // WerSvc default startup: Manual (3). Three-method approach: service stop, sc.exe config, direct registry write.
    // Registry Disabled=1 suppresses WER even if service somehow starts again (e.g. triggered by another process).
    enable: `sc.exe stop WerSvc 2>&1 | Out-Null
sc.exe config WerSvc start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WerSvc" /v Start /t REG_DWORD /d 4 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f`,
    // Revert: set Disabled=0 (WER enabled, Windows default), restore service to Manual
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WerSvc" /v Start /t REG_DWORD /d 3 /f
sc.exe config WerSvc start= demand 2>&1 | Out-Null`,
  },

  "Disable Connected Telemetry (DiagTrack)": {
    requiresAdmin: true,
    // DiagTrack default startup: Automatic (2). Policy AllowTelemetry=0 blocks upload even if service restarts.
    enable: `sc.exe stop DiagTrack 2>&1 | Out-Null
sc.exe config DiagTrack start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\DiagTrack" /v Start /t REG_DWORD /d 4 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f`,
    // Revert: set AllowTelemetry=3 (Full, Windows default for Home/Pro), restore DiagTrack to Automatic
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 3 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\DiagTrack" /v Start /t REG_DWORD /d 2 /f
sc.exe config DiagTrack start= auto 2>&1 | Out-Null`,
  },

  "Disable Application Compatibility Telemetry": {
    requiresAdmin: true,
    // PcaSvc default: Manual (3). AITEnable=0 disables Application Insights Telemetry collection.
    // DisableInventory=1 stops Windows from building an installed-software inventory for compatibility.
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /t REG_DWORD /d 1 /f
sc.exe stop PcaSvc 2>&1 | Out-Null
sc.exe config PcaSvc start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v Start /t REG_DWORD /d 4 /f`,
    // Revert: set AITEnable=1 (enabled, Windows default), DisableInventory=0 (inventory on, Windows default), restore PcaSvc to Manual
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v Start /t REG_DWORD /d 3 /f
sc.exe config PcaSvc start= demand 2>&1 | Out-Null`,
  },

  "Disable Windows Activity History": {
    requiresAdmin: true,
    // Policy keys do not exist by default — delete on revert to restore Windows default behavior.
    // EnableActivityFeed=0 stops logging. PublishUserActivities/UploadUserActivities=0 blocks upload.
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 0 /f`,
    // Revert: set all three to 1 (enabled, Windows default — activity logging on)
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 1 /f`,
  },

  "Disable Windows Advertising ID": {
    requiresAdmin: true,
    // HKCU default: Enabled=1. HKLM policy enforces disable system-wide regardless of user setting.
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 1 /f`,
    // Revert: restore HKCU to enabled (Windows default=1), set policy to 0 (not disabled by policy)
    disable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows Content Delivery Manager": {
    requiresAdmin: false,
    // All values default to 1 in HKCU — set to 0 to disable, revert sets back to 1 (Windows default).
    // Covers: silent app installs, feature management, OEM/pre-installed apps, lock screen content, suggested Start apps.
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v ContentDeliveryAllowed /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v FeatureManagementEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v OemPreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v PreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SilentInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353698Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f`,
    // Revert: restore all values to 1 (Windows default)
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
    // Policy keys do not exist by default — delete on revert to restore Windows default (clipboard history enabled).
    // HKCU EnableClipboardHistory=0 also disables the user-side feature.
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /t REG_DWORD /d 0 /f`,
    // Revert: policy allowed=1 (no policy restriction, Windows default), HKCU EnableClipboardHistory=0
    // (clipboard history is OFF by default in Windows — user must manually enable it in Settings)
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /t REG_DWORD /d 0 /f`,
  },

  "Disable Virtualization-Based Security (VBS)": {
    requiresAdmin: true,
    requiresRestart: true,
    // All three DeviceGuard keys: EnableVirtualizationBasedSecurity=0 disables VBS,
    // RequirePlatformSecurityFeatures=0 disables Secure Boot requirement for VBS,
    // HypervisorEnforcedCodeIntegrity=0 disables HVCI (kernel code integrity enforcement).
    // Keys do not exist by default on non-OEM systems — delete on revert to restore Windows default.
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v RequirePlatformSecurityFeatures /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v HypervisorEnforcedCodeIntegrity /t REG_DWORD /d 0 /f`,
    // Revert: restore Windows default VBS/HVCI values (VBS=1 enabled, Secure Boot=1 required, HVCI=0 off by default)
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v RequirePlatformSecurityFeatures /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v HypervisorEnforcedCodeIntegrity /t REG_DWORD /d 0 /f`,
  },

  "Raise System Timer IRQ Priority": {
    requiresAdmin: true,
    // IRQ8Priority=1 elevates the system timer interrupt (CMOS/RTC) priority.
    // Key does not exist by default — delete on revert to restore Windows default.
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v IRQ8Priority /t REG_DWORD /d 1 /f`,
    // Revert: set IRQ8Priority=0 (Windows default — no priority override)
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v IRQ8Priority /t REG_DWORD /d 0 /f`,
  },

  "Optimize AFD Network Socket Buffers": {
    requiresAdmin: true,
    // Windows AFD default socket buffer: ~8KB. Setting to 131072 (128KB) reduces kernel/user context switches
    // for network I/O, benefiting UDP-heavy online games.
    // Keys do not exist by default — delete on revert to restore Windows AFD defaults.
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" /v DefaultReceiveWindow /t REG_DWORD /d 131072 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" /v DefaultSendWindow /t REG_DWORD /d 131072 /f`,
    // Revert: set both buffers back to 8192 bytes (Windows AFD default)
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" /v DefaultReceiveWindow /t REG_DWORD /d 8192 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" /v DefaultSendWindow /t REG_DWORD /d 8192 /f`,
  },

  "Foreground Application Priority Lock Timeout": {
    requiresAdmin: false,
    // ForegroundLockTimeout lives in HKCU — no admin required.
    // Windows default: 200000 (microseconds = 0.2 seconds).
    // Setting to 0 makes foreground priority boost begin instantly when you switch to a window.
    // Detection: creg checks HKCU:\Control Panel\Desktop ForegroundLockTimeout = 0
    enable: `reg add "HKCU\\Control Panel\\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 0 /f`,
    // Revert: restore Windows default of 200000 microseconds (0x30D40 decimal)
    disable: `reg add "HKCU\\Control Panel\\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 200000 /f`,
  },

  "Disable Print Spooler": {
    requiresAdmin: true,
    // Spooler default startup: Automatic (Start=2).
    // Three-method approach: stop running service, sc.exe config, direct registry write.
    // All three together ensure the service is fully disabled even if Windows tries to auto-start it.
    enable: `sc.exe stop spooler 2>&1 | Out-Null
sc.exe config spooler start= disabled 2>&1 | Out-Null
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\spooler" /v Start /t REG_DWORD /d 4 /f`,
    // Revert: restore to Automatic (Start=2, Windows default), then start the service
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\spooler" /v Start /t REG_DWORD /d 2 /f
sc.exe config spooler start= auto 2>&1 | Out-Null
sc.exe start spooler 2>&1 | Out-Null`,
  },

  "NTFS MFT Zone Reservation": {
    requiresAdmin: true,
    // NtfsMftZoneReservation: Windows default = 1 (1/8th of volume = 12.5% reserved in zone 1).
    // Setting to 2 increases to zone 2 (1/4 of volume = 25%) for drives with moderate file counts.
    // Changes take effect immediately — no restart required.
    // Detection: creg checks HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem NtfsMftZoneReservation = 2
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsMftZoneReservation /t REG_DWORD /d 2 /f`,
    // Revert: restore Windows default of 1
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsMftZoneReservation /t REG_DWORD /d 1 /f`,
  },

  "Exclude Driver Updates from Windows Update": {
    requiresAdmin: true,
    // ExcludeWUDriversInQualityUpdate: Group Policy key that stops Windows Update from pushing
    // device driver updates through Quality Update channels. Only affects driver updates —
    // all security patches, cumulative updates, and OS feature updates are fully unaffected.
    // Detection: creg checks HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate ExcludeWUDriversInQualityUpdate = 1
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" /v ExcludeWUDriversInQualityUpdate /t REG_DWORD /d 1 /f`,
    // Revert: set to 0 (drivers included in Windows Update, Windows default)
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" /v ExcludeWUDriversInQualityUpdate /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows Copilot AI Sidebar": {
    requiresAdmin: true,
    // Official Group Policy key: TurnOffWindowsCopilot=1 under HKLM.
    // Affects Windows 11 23H2+ only — key is silently ignored on Windows 10 / Win11 < 23H2.
    // Stops the BingCoPilot background browser process and removes the Copilot taskbar button.
    // Detection: creg checks HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot TurnOffWindowsCopilot = 1
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f`,
    // Revert: set to 0 (Copilot enabled, Windows default on 23H2+)
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 0 /f`,
  },

  "Disable Windows 11 Widgets Panel": {
    requiresAdmin: true,
    // Official Group Policy key: AllowNewsAndInterests=0 under HKLM\SOFTWARE\Policies\Microsoft\Dsh.
    // Affects Windows 11 only — silently ignored on Windows 10.
    // Stops the Widgets background fetch process and removes the Widgets taskbar button.
    // Detection: creg checks HKLM:\SOFTWARE\Policies\Microsoft\Dsh AllowNewsAndInterests = 0
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f`,
    // Revert: set to 1 (Widgets enabled, Windows default on Windows 11)
    disable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 1 /f`,
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
