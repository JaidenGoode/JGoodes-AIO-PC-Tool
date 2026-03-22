// ─────────────────────────────────────────────────────────────────────────────
// tweaks/detect.ts  —  Windows PowerShell detection script
//
// This script runs on the user's Windows PC via PowerShell to detect which
// tweaks are currently applied. It outputs a JSON object mapping each tweak
// title to 1 (applied) or 0 (not applied).
//
// HOW IT WORKS:
//   creg($path, $name, $value)  → checks a registry key equals the given value
//   csvc($name)                 → checks if a service is set to Disabled (Start=4)
//   $d = hashtable              → collects all results
//   $d | ConvertTo-Json         → outputs results as JSON
//
// To add detection for a new tweak, add a line like:
//   $d['Your Tweak Title'] = creg 'HKLM:\...' 'ValueName' expectedValue
// or:
//   $d['Your Tweak Title'] = csvc 'ServiceName'
//
// ─────────────────────────────────────────────────────────────────────────────

export const TWEAK_DETECT_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
function creg($p,$n,$v){
  try{
    $r=(Get-ItemProperty -Path $p -Name $n -ErrorAction Stop)."$n"
    if($r -eq $v){return 1}else{return 0}
  }catch{return 0}
}
function csvc($n){
  try{
    $s=Get-Service -Name $n -ErrorAction Stop
    if($s.StartType -eq 'Disabled'){return 1}else{return 0}
  }catch{return 0}
}

$d=[ordered]@{}

# Performance
$d['Disable SuperFetch / SysMain']=csvc 'SysMain'
try{$fsu=((fsutil behavior query disablelastaccess 2>$null) -join ' ');$d['Disable NTFS Access Timestamps']=if($fsu -match 'DisableLastAccess\w*\s*=\s*[1-9]'){1}else{0}}catch{$d['Disable NTFS Access Timestamps']=0}
$d['Disable Windows Performance Counters']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib' 'Disable Performance Counters' 4
$d['Disable Windows File Indexing']=csvc 'WSearch'
$d['Disable Multiplane Overlay (MPO)']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode' 5
$d['Disable Hibernation']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 0
$d['Disable Background UWP Apps']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' 'GlobalUserDisabled' 1
$d['Optimize Visual Effects for Performance']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'VisualFXSetting' 2
$d['Disable Cortana']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana' 0

# Gaming
$d['Disable Mouse Acceleration']=creg 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '0'
try{$cpm=(powercfg /query SCHEME_CURRENT SUB_PROCESSOR 0cc5b647-c1df-4637-891a-dec35c318583 2>$null) -join ' ';$d['Keep All CPU Cores Active (Unpark Cores)']=if($cpm -match 'Current AC Power Setting Index:\s*0x00000064'){1}else{0}}catch{$d['Keep All CPU Cores Active (Unpark Cores)']=0}
$d['Win32 Priority Separation']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' 'Win32PrioritySeparation' 36
try{$gb=(Get-AppxPackage -AllUsers Microsoft.XboxGamingOverlay -ErrorAction SilentlyContinue);$d['Disable GameBar']=if($null -eq $gb -or @($gb).Count -eq 0){1}else{0}}catch{$d['Disable GameBar']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0}
$d['Disable GameBar Background Recording']=creg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0
$d['Optimize for Windowed & Borderless Games']=creg 'HKCU:\System\GameConfigStore' 'GameDVR_FSEOptimization' 1
$d['Enable Game Mode']=creg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1
$d['Enable Hardware Accelerated GPU Scheduling (HAGS)']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 2
$d['Instant Menu Response (Zero Delay)']=creg 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '0'
$d['Disable Full Screen Optimizations']=creg 'HKCU:\System\GameConfigStore' 'GameDVR_FSEBehavior' 2
try{$_sp='HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile';$_nti=(Get-ItemProperty -Path $_sp -Name 'NetworkThrottlingIndex' -EA Stop).NetworkThrottlingIndex;$_sr=(Get-ItemProperty -Path $_sp -Name 'SystemResponsiveness' -EA Stop).SystemResponsiveness;$d['System Responsiveness & Network Throttling']=if(($_nti -eq -1 -or [uint32]$_nti -eq 4294967295) -and $_sr -eq 0){1}else{0}}catch{$d['System Responsiveness & Network Throttling']=0}
$d['Maximum Priority for Games']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' 'Latency Sensitive' 'True'
$d['Fortnite Process High Priority']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\FortniteClient-Win64-Shipping.exe\PerfOptions' 'CpuPriorityClass' 5
try{$ifaces=Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' -EA Stop;$nag=0;foreach($i in $ifaces){try{if((Get-ItemProperty $i.PSPath 'TcpAckFrequency' -EA Stop).TcpAckFrequency -eq 1){$nag=1;break}}catch{}};$d["Disable Nagle's Algorithm"]=$nag}catch{$d["Disable Nagle's Algorithm"]=0}
$d['Disable Xbox Core Services']=csvc 'XboxGipSvc'

# System / Network
$d['Disable IPv6']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' 255
try{$ipv6v=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' -EA Stop).DisabledComponents;$d['Prefer IPv4 over IPv6']=if($ipv6v -eq 32){1}else{0}}catch{$d['Prefer IPv4 over IPv6']=0}
try{$fsu=((fsutil behavior query DisableDeleteNotify 2>$null) -join ' ');$d['Enable SSD TRIM Optimization']=if($fsu -match 'DisableDeleteNotify\w*\s*=\s*0'){1}else{0}}catch{$d['Enable SSD TRIM Optimization']=0}
$d['Disable Web Search in Windows Search']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'BingSearchEnabled' 0
try{$tcp=(netsh int tcp show global 2>$null) -join ' ';$d['Disable Windows TCP Auto-Tuning']=if($tcp -match 'Receive Window Auto-Tuning Level\s*:\s*disabled'){1}else{0}}catch{$d['Disable Windows TCP Auto-Tuning']=0}
$d['Disable Startup Program Delay']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' 'StartupDelayInMSec' 0
$d['Disable Windows Automatic Maintenance']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance' 'MaintenanceDisabled' 1
$d['Disable Power Throttling']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' 'PowerThrottlingOff' 1
$d['Disable Remote Assistance']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance' 'fAllowToGetHelp' 0
$d['Disable Phone Link & Mobile Sync']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableCdp' 0

# Performance (Cortex Disk Cache & Desktop Menu)
$d['Auto-End Unresponsive Programs']=creg 'HKCU:\Control Panel\Desktop' 'AutoEndTasks' '1'
try{$dfTask=schtasks /Query /TN "Microsoft\Windows\Defrag\ScheduledDefrag" /FO CSV 2>$null;$d['Disable Scheduled Disk Defragmentation']=if($dfTask -match 'Disabled'){1}else{0}}catch{$d['Disable Scheduled Disk Defragmentation']=0}
$d['Keep Kernel & Drivers in RAM']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' 'DisablePagingExecutive' 1
try{$mc=(Get-MMAgent -EA Stop).MemoryCompression;$d['Disable Memory Compression']=if($mc -eq $false){1}else{0}}catch{$d['Disable Memory Compression']=0}
$d['Release Unused DLLs from Memory']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' 'AlwaysUnloadDLL' 1
try{$svch=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control' 'SvcHostSplitThresholdInKB' -EA Stop).SvcHostSplitThresholdInKB;$d['Svchost Process Isolation']=if($svch -gt 1000000){1}else{0}}catch{$d['Svchost Process Isolation']=0}
$d['Disable 8.3 Short File Names']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' 'NtfsDisable8dot3NameCreation' 1
$d['Optimize Boot Configuration']=creg 'HKLM:\SOFTWARE\Microsoft\Dfrg\BootOptimizeFunction' 'Enable' 'Y'
$d['Increase System I/O Performance']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' 'IoPageLockLimit' 983040

# System (Cortex Desktop Menu & Network)
$d['Disable Taskbar & Menu Animations']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarAnimations' 0
# Startup disk check: detect if C: is excluded from autocheck via chkntfs
try{$cntfsOut=(chkntfs C: 2>&1) -join ' ';$d['Disable Startup Disk Check']=if($cntfsOut -match 'excluded|will not be checked|not scheduled'){1}else{0}}catch{$d['Disable Startup Disk Check']=0}
$d['Reduce Taskbar Preview Delay']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'ExtendedUIHoverTime' 100
$d['Disable AutoPlay for External Devices']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' 'NoDriveTypeAutoRun' 255
$d['Disable Notification Center']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' 0
$d['Reduce Keyboard Input Delay']=creg 'HKCU:\Control Panel\Keyboard' 'KeyboardDelay' '0'
$d['Increase Network Buffer Size']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' 'SizReqBuf' 65535
$d['Optimize DNS Resolution']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' 'MaxNegativeCacheTtl' 5
$d['Unlock Reserved Network Bandwidth']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched' 'NonBestEffortLimit' 0
$d['Increase Browser Connection Limits']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' 'MaxConnectionsPerServer' 16

# Network
$d['Disable Delivery Optimization Service']=csvc 'DoSvc'

$d['Disable SMBv1 Protocol']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' 'SMB1' 0

try{$rss=(netsh int tcp show global 2>$null) -join ' ';$d['Enable Receive Side Scaling (RSS)']=if($rss -match 'Receive-Side Scaling State\s*:\s*enabled'){1}else{0}}catch{$d['Enable Receive Side Scaling (RSS)']=0}

# Gaming (additional)
try{$bcd=(bcdedit /enum 2>$null) -join ' ';$d['Disable HPET (Platform Clock)']=if($bcd -match 'useplatformclock\s+No'){1}else{0}}catch{$d['Disable HPET (Platform Clock)']=0}
$d['Disable Auto-Restart After Windows Updates']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoRebootWithLoggedOnUsers' 1
# Performance (additional)
$d['Disable Transparency Effects']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 0
$d['Increase Gaming Task Priority in System Scheduler']=creg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Audio' 'Scheduling Category' 'High'
$d['Disable Tile Notification System']=creg 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' 'NoTileApplicationNotification' 1

# Gaming (Razer Cortex Speed Up style)
try{
  $usbGuid="2a737441-1930-4402-8d77-b2bebba308a3"
  $usbSub="48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
  $usbOut=(powercfg /query SCHEME_CURRENT $usbGuid $usbSub 2>$null) -join ' '
  $d['Disable USB Selective Suspend']=if($usbOut -match 'Current AC Power Setting Index: 0x00000000'){1}else{0}
}catch{$d['Disable USB Selective Suspend']=0}
try{$bcd=(bcdedit /enum 2>$null) -join ' ';$d['Set TSC Sync Policy (Precise Game Timing)']=if($bcd -match 'tscsyncpolicy\s+Enhanced'){1}else{0}}catch{$d['Set TSC Sync Policy (Precise Game Timing)']=0}

# Network (Razer Cortex Speed Up style)
try{$tfo=(netsh int tcp show global 2>$null) -join ' ';$d['Enable TCP Fast Open']=if($tfo -match 'Fast Open\s*:\s*enabled'){1}else{0}}catch{$d['Enable TCP Fast Open']=0}
try{
  $imOff=0
  Get-NetAdapter -Physical -EA Stop | ForEach-Object {
    try{
      $im=Get-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*InterruptModeration" -EA Stop
      if($im -and ($im.RegistryValue -eq 0 -or $im.RegistryValue -eq '0')){$imOff=1}
    }catch{}
  }
  $d['Disable NIC Interrupt Moderation']=$imOff
}catch{$d['Disable NIC Interrupt Moderation']=0}

# New Performance tweaks
$d['Disable Windows Error Reporting']=creg 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' 'Disabled' 1
$d['Disable Connected Telemetry (DiagTrack)']=csvc 'DiagTrack'
$d['Disable Application Compatibility Telemetry']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat' 'AITEnable' 0

# New System tweaks
$d['Disable Windows Activity History']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableActivityFeed' 0
$d['Disable Windows Advertising ID']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
$d['Disable Windows Content Delivery Manager']=creg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' 'SilentInstalledAppsEnabled' 0
$d['Disable Clipboard History Collection']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'AllowClipboardHistory' 0

# New Gaming tweaks
$d['Disable Virtualization-Based Security (VBS)']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard' 'EnableVirtualizationBasedSecurity' 0
$d['Raise System Timer IRQ Priority']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' 'IRQ8Priority' 1

# New Network tweaks
$d['Optimize AFD Network Socket Buffers']=creg 'HKLM:\SYSTEM\CurrentControlSet\Services\AFD\Parameters' 'DefaultReceiveWindow' 131072

# 6 new professional tweaks
# Foreground Priority Lock Timeout: HKCU, no admin — DWORD 0 means instant priority switch
$d['Foreground Application Priority Lock Timeout']=creg 'HKCU:\Control Panel\Desktop' 'ForegroundLockTimeout' 0
# Print Spooler: disabled = Start=4, Windows default = 2 (Automatic)
$d['Disable Print Spooler']=csvc 'spooler'
# NTFS MFT Zone Reservation: 2 = zone 2 (25% reserved), default = 1
$d['NTFS MFT Zone Reservation']=creg 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' 'NtfsMftZoneReservation' 2
# Exclude Driver Updates from Windows Update: Group Policy DWORD = 1
$d['Exclude Driver Updates from Windows Update']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' 'ExcludeWUDriversInQualityUpdate' 1
# Windows Copilot AI: Win11 23H2+ only — key is silently ignored on Win10/older Win11
$d['Disable Windows Copilot AI Sidebar']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot' 1
# Windows 11 Widgets Panel: Win11 only — key is silently ignored on Win10
$d['Disable Windows 11 Widgets Panel']=creg 'HKLM:\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests' 0

$d | ConvertTo-Json -Compress`;
