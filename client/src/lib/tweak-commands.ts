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
    enable: `# ── PRIVACY: Handwriting & Typing Input (P001/P002/P008) ─────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" /v RestrictImplicitInkCollection /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\HandwritingErrorReports" /v PreventHandwritingErrorReports /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Input\\TIPC" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" /v AllowInputPersonalization /t REG_DWORD /d 0 /f
# ── PRIVACY: System & Security (P003/P004/S001/S002) ─────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v NoLockScreenCamera /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CredUI" /v DisablePasswordReveal /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableUAR /t REG_DWORD /d 1 /f
# ── PRIVACY: Advertising & Bluetooth (P005/P006/P026) ────────────────────
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Bluetooth" /v AllowAdvertising /t REG_DWORD /d 0 /f
# ── PRIVACY: Telemetry & Error Reporting (P027/P069/S003/U001/U004-U007) ──
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /t REG_DWORD /d 0 /f
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Disable 2>nul
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v DoNotShowFeedbackNotifications /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v DisableOneSettingsDownloads /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Messaging" /v AllowMessageSync /t REG_DWORD /d 0 /f
Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DiagTrack -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name dmwappushservice -ErrorAction SilentlyContinue
Set-Service -Name WerSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name WerSvc -ErrorAction SilentlyContinue
# ── ACTIVITY HISTORY & CLIPBOARD (A001-A006) ──────────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /t REG_DWORD /d 0 /f
# ── APP PRIVACY (P007/P023/P025/P033/P036/P056) ───────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsAccessAccountInfo /t REG_DWORD /d 2 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Start_TrackProgs /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsGetDiagnosticInfo /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsAccessLocation /t REG_DWORD /d 2 /f
# ── START MENU & CONTENT SUGGESTIONS (P064/P065/P066/P067/P070/M006) ─────
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353694Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353696Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement" /v ScoobeSystemSettingEnabled /t REG_DWORD /d 0 /f
# ── CORTANA & SEARCH (C002/C007-C015/C012) ────────────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v ConnectedSearchUseWeb /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCloudSearch /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortanaAboveLock /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v CortanaConsent /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\SearchSettings" /v IsDynamicSearchBoxEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v RestrictImplicitTextCollection /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v RestrictImplicitInkCollection /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Personalization\\Settings" /v AcceptedPrivacyPolicy /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" /v HasAccepted /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Speech" /v AllowSpeechModelUpdate /t REG_DWORD /d 0 /f
# ── WINDOWS AI / COPILOT / RECALL (C101/C102/C103/C201/C203/C204/C205) ───
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowCopilotButton /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v DisableAIDataAnalysis /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v AllowRecallEnablement /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v EnableAIImageCreator /t REG_DWORD /d 0 /f
# ── WINDOWS SETTINGS SYNC (Y001-Y007) ────────────────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync" /v DisableSettingSync /t REG_DWORD /d 2 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync" /v DisableSettingSyncUserOverride /t REG_DWORD /d 1 /f
# ── LOCATION SERVICES (L001/L003/L005) ───────────────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocation /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocationScripting /t REG_DWORD /d 1 /f
Set-Service -Name lfsvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name lfsvc -ErrorAction SilentlyContinue
# ── MICROSOFT EDGE CHROMIUM POLICIES (E101-E230) ──────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v TrackingPrevention /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PaymentMethodQueryEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PersonalizationReportingEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v URLAddressBarDropdownEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v UserFeedbackAllowed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillCreditCardEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillAddressEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v LocalProvidersEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SearchSuggestEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeShoppingAssistantEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HubsSidebarEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ShowMicrosoftRewards /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SignInAllowed /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SpellCheckServiceEnabled /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AlternateErrorPagesEnabled /t REG_DWORD /d 0 /f
# ── MICROSOFT EDGE LEGACY POLICIES (E001/E002/E003/E006-E008/E010-E012) ──
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v DoNotTrack /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\TabPreloader" /v PreventTabPreloading /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\SearchScopes" /v ShowSearchSuggestionsGlobal /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Geolocation" /v PolicyConfigSystemFLEnable /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v "FormSuggest Passwords" /t REG_SZ /d "no" /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v "Use FormSuggest" /t REG_SZ /d "no" /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\PhishingFilter" /v EnabledV9 /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\BooksLibrary" /v EnableExtendedBooksTelemetry /t REG_DWORD /d 0 /f
# ── LOCK SCREEN (K001/K002/K005) ──────────────────────────────────────────
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /t REG_DWORD /d 0 /f
# ── TASKBAR & START MENU (M015/M016/M018/M021/M025) ─────────────────────
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v PeopleBand /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v HideSCAMeetNow /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f
# ── MOBILE DEVICES & PHONE LINK (D001/D002/D003/D104) ────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /t REG_DWORD /d 0 /f
# ── WINDOWS UPDATE DELIVERY OPTIMIZATION (W001/W011) ─────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f
# ── MISCELLANEOUS (M001/M004/M005/M022/M024/M026/M027/M028) ─────────────
reg add "HKCU\\Software\\Microsoft\\Siuf\\Rules" /v NumberOfSIUFInPeriod /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Siuf\\Rules" /v PeriodInNanoSeconds /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v OemPreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v PreInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SilentInstalledAppsEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\MediaPlayer\\Preferences" /v UsageTracking /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowToGetHelp /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel" /v "{2cc5ca98-6485-489a-920e-b3e88a6ccce3}" /t REG_DWORD /d 1 /f
# ── CONSUMER FEATURES & ONEDRIVE ─────────────────────────────────────────
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f
taskkill /f /im OneDrive.exe 2>nul
Start-Sleep -Milliseconds 500
$oneDrivePaths = @(
  "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe",
  "$env:SystemRoot\\System32\\OneDriveSetup.exe",
  "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDriveSetup.exe"
)
foreach ($p in $oneDrivePaths) { if (Test-Path $p) { & $p /uninstall 2>nul; break } }
# ── EXPLORER, SHELL & SYSTEM ─────────────────────────────────────────────
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v TaskbarEndTask /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Hidden /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v AllowStorageSenseGlobal /t REG_DWORD /d 0 /f
reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v Flags /t REG_SZ /d "506" /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme /t REG_DWORD /d 0 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl" /v DisplayParameters /t REG_DWORD /d 1 /f
@("WMPNetworkSvc","PimIndexMaintenanceSvc","MapsBroker") | ForEach-Object { Set-Service -Name $_ -StartupType Manual -ErrorAction SilentlyContinue }`,
    disable: `# Restore Consumer Features
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /f 2>nul
# Restore Telemetry & Error Reporting
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /f 2>nul
reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v CEIPEnable /f 2>nul
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v Disabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v AITEnable /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v DoNotShowFeedbackNotifications /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v DisableOneSettingsDownloads /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Messaging" /v AllowMessageSync /f 2>nul
Set-Service -Name DiagTrack -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service -Name dmwappushservice -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service -Name WerSvc -StartupType Manual -ErrorAction SilentlyContinue
# Restore Privacy
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" /v RestrictImplicitInkCollection /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" /v AllowInputPersonalization /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\HandwritingErrorReports" /v PreventHandwritingErrorReports /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Input\\TIPC" /v Enabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableInventory /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" /v DisableUAR /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v NoLockScreenCamera /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CredUI" /v DisablePasswordReveal /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v DisabledByGroupPolicy /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Bluetooth" /v AllowAdvertising /f 2>nul
# Restore Activity History & Clipboard
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v UploadUserActivities /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowClipboardHistory /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v AllowCrossDeviceClipboard /f 2>nul
# Restore App Privacy
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsAccessAccountInfo /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsGetDiagnosticInfo /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsAccessLocation /f 2>nul
# Restore Start Menu Suggestions
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353694Enabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-353696Enabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SoftLandingEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement" /v ScoobeSystemSettingEnabled /f 2>nul
# Restore Cortana & Search
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v DisableWebSearch /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v ConnectedSearchUseWeb /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCloudSearch /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortanaAboveLock /f 2>nul
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 1 /f
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\SearchSettings" /v IsDynamicSearchBoxEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\InputPersonalization" /v RestrictImplicitTextCollection /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\InputPersonalization" /v RestrictImplicitInkCollection /f 2>nul
# Restore Copilot & AI
reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v DisableAIDataAnalysis /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v AllowRecallEnablement /f 2>nul
# Restore Settings Sync
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync" /v DisableSettingSync /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SettingSync" /v DisableSettingSyncUserOverride /f 2>nul
# Restore Location (user-specified restore values: 0 = not blocked by policy)
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocation /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableWindowsLocationProvider /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocationScripting /t REG_DWORD /d 0 /f
Set-Service -Name lfsvc -StartupType Manual -ErrorAction SilentlyContinue
# Restore Edge Chromium Policies
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v TrackingPrevention /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PaymentMethodQueryEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v PersonalizationReportingEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v URLAddressBarDropdownEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v UserFeedbackAllowed /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillCreditCardEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AutofillAddressEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v LocalProvidersEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SearchSuggestEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v EdgeShoppingAssistantEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HubsSidebarEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v ShowMicrosoftRewards /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SignInAllowed /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v SpellCheckServiceEnabled /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v AlternateErrorPagesEnabled /f 2>nul
# Restore Edge Legacy Policies
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v DoNotTrack /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v "FormSuggest Passwords" /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main" /v "Use FormSuggest" /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\TabPreloader" /v PreventTabPreloading /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\PhishingFilter" /v EnabledV9 /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\SearchScopes" /v ShowSearchSuggestionsGlobal /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Geolocation" /v PolicyConfigSystemFLEnable /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\BooksLibrary" /v EnableExtendedBooksTelemetry /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl" /v DisplayParameters /f 2>nul
# Restore Lock Screen
reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /f 2>nul
reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /f 2>nul
# Restore Taskbar
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v PeopleBand /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v HideSCAMeetNow /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /f 2>nul
# Restore Mobile Devices
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /f 2>nul
# Restore Windows Update P2P
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /f 2>nul
# Restore Miscellaneous
reg delete "HKCU\\Software\\Microsoft\\Siuf\\Rules" /v NumberOfSIUFInPeriod /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Siuf\\Rules" /v PeriodInNanoSeconds /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v OemPreInstalledAppsEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v PreInstalledAppsEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SilentInstalledAppsEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\MediaPlayer\\Preferences" /v UsageTracking /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance" /v fAllowToGetHelp /f 2>nul
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel" /v "{2cc5ca98-6485-489a-920e-b3e88a6ccce3}" /f 2>nul
# Restore Explorer & Shell
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v TaskbarEndTask /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowCopilotButton /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v EnableAIImageCreator /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Start_TrackProgs /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Speech" /v AllowSpeechModelUpdate /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v CortanaConsent /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Personalization\\Settings" /v AcceptedPrivacyPolicy /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" /v HasAccepted /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v AllowStorageSenseGlobal /f 2>nul
# Restore scheduled tasks
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Enable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Enable 2>nul
schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Enable 2>nul
# Restore services
Set-Service -Name WMPNetworkSvc -StartupType Manual -ErrorAction SilentlyContinue
Set-Service -Name PimIndexMaintenanceSvc -StartupType Manual -ErrorAction SilentlyContinue
Set-Service -Name MapsBroker -StartupType Automatic -ErrorAction SilentlyContinue`,
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
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 1 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Priority /t REG_DWORD /d 2 /f
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v Affinity /f 2>nul
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Clock Rate" /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehaviorMode /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_HonorUserFSEBehaviorMode /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_DXGIHonorFSEWindowsCompatible /f 2>nul
reg delete "HKCU\\System\\GameConfigStore" /v GameDVR_FSEBehavior /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /f 2>nul`,
  },

  "Fortnite Process High Priority": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe\\PerfOptions" /v IoPriority /t REG_DWORD /d 3 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\FortniteClient-Win64-Shipping.exe" /f 2>nul
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\fortniteclient-win64-shipping_eac_eos.exe" /f 2>nul`,
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
# Opera GX: Disable hardware acceleration via settings file (UTF-8 safe)
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $pref.system) { $pref | Add-Member -Force -NotePropertyName "system" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.system | Add-Member -Force -NotePropertyName "hardware_acceleration_mode_previous" -NotePropertyValue $false
    $pref | ConvertTo-Json -Depth 100 | Set-Content $operaGxPath -Encoding UTF8
}`,
    disable: `# Re-enable Opera GX hardware acceleration (UTF-8 safe)
$operaGxPath = "$env:APPDATA\\Opera Software\\Opera GX Stable\\Preferences"
if (Test-Path $operaGxPath) {
    $pref = Get-Content $operaGxPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $pref.system) { $pref | Add-Member -Force -NotePropertyName "system" -NotePropertyValue ([PSCustomObject]@{}) }
    $pref.system | Add-Member -Force -NotePropertyName "hardware_acceleration_mode_previous" -NotePropertyValue $true
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
    disable: `reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v DisableAIDataAnalysis /f 2>nul
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v AllowRecallEnablement /f 2>nul`,
  },

  "Disable Lock Screen Suggestions & Ads": {
    enable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /t REG_DWORD /d 0 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightFeatures /f 2>nul
reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsSpotlightOnActionCenter /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v RotatingLockScreenOverlayEnabled /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v LockScreenToastEnabled /f 2>nul`,
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
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableCdp /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Mobility" /v AllowLinkDevices /f 2>nul`,
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
    enable: `schtasks /Change /TN "Microsoft\\Windows\\Defrag\\ScheduledDefrag" /Disable 2>nul
reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v OptimizeComplete /t REG_SZ /d "No" /f 2>nul`,
    disable: `schtasks /Change /TN "Microsoft\\Windows\\Defrag\\ScheduledDefrag" /Enable 2>nul`,
  },

  "Keep Kernel & Drivers in RAM": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v DisablePagingExecutive /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v DisablePagingExecutive /t REG_DWORD /d 0 /f`,
  },

  "Disable Memory Compression": {
    requiresAdmin: true,
    enable: `Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue`,
    disable: `Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue`,
  },

  "Release Unused DLLs from Memory": {
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v AlwaysUnloadDLL /t REG_DWORD /d 1 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v AlwaysUnloadDLL /f 2>nul`,
  },

  "Svchost Process Isolation": {
    requiresAdmin: true,
    enable: `$ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1KB
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d $ram /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v SvcHostSplitThresholdInKB /t REG_DWORD /d 380000 /f`,
  },

  "Disable 8.3 Short File Names": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 1 /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v NtfsDisable8dot3NameCreation /t REG_DWORD /d 0 /f`,
  },

  "Optimize Boot Configuration": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "Y" /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnablePrefetcher /t REG_DWORD /d 3 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnableSuperfetch /t REG_DWORD /d 3 /f 2>nul`,
    disable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Dfrg\\BootOptimizeFunction" /v Enable /t REG_SZ /d "N" /f`,
  },

  "Increase System I/O Performance": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /t REG_DWORD /d 983040 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v IoPageLockLimit /f 2>nul`,
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
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" /v BootExecute /t REG_MULTI_SZ /d "autocheck autochk *" /f`,
    disable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" /v BootExecute /t REG_MULTI_SZ /d "autocheck autochk *" /f`,
  },

  "Reduce Taskbar Preview Delay": {
    enable: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ExtendedUIHoverTime /t REG_DWORD /d 100 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ThumbnailLivePreviewHoverTime /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ExtendedUIHoverTime /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ThumbnailLivePreviewHoverTime /f 2>nul`,
  },

  "Disable AutoPlay for External Devices": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /t REG_DWORD /d 255 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /f 2>nul
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v NoDriveTypeAutoRun /f 2>nul`,
  },

  "Disable Notification Center": {
    enable: `reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v ToastEnabled /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /f 2>nul
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
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SizReqBuf /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v IRPStackSize /f 2>nul`,
  },

  "Optimize TCP/IP Network Stack": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v DefaultTTL /t REG_DWORD /d 64 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUDiscovery /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUBHDetect /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v SackOpts /t REG_DWORD /d 1 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpMaxDataRetransmissions /t REG_DWORD /d 5 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v Tcp1323Opts /t REG_DWORD /d 1 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v DefaultTTL /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUDiscovery /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v EnablePMTUBHDetect /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v SackOpts /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpMaxDataRetransmissions /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v Tcp1323Opts /f 2>nul`,
  },

  "Optimize DNS Resolution": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheEntryTtlLimit /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxSOACacheEntryTtlLimit /t REG_DWORD /d 300 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheTtl /t REG_DWORD /d 86400 /f
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxNegativeCacheTtl /t REG_DWORD /d 5 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheEntryTtlLimit /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxSOACacheEntryTtlLimit /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxCacheTtl /f 2>nul
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v MaxNegativeCacheTtl /f 2>nul`,
  },

  "Unlock Reserved Network Bandwidth": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /f 2>nul`,
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
    enable: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe\\PerfOptions" /v CpuPriorityClass /t REG_DWORD /d 2 /f
# Disable Discord overlay via config file
$discordCfg = "$env:APPDATA\\discord\\settings.json"
if (Test-Path $discordCfg) {
    $cfg = Get-Content $discordCfg -Raw -Encoding UTF8 | ConvertFrom-Json
    $cfg | Add-Member -Force -NotePropertyName "enableHardwareAcceleration" -NotePropertyValue $false
    $cfg | Add-Member -Force -NotePropertyName "IS_MAXIMIZED" -NotePropertyValue $false
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $discordCfg -Encoding UTF8
}`,
    disable: `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Discord.exe" /f 2>nul`,
  },

  // ── NETWORK ────────────────────────────────────────────────────────────────
  "Disable NetBIOS over TCP/IP": {
    requiresAdmin: true,
    enable: `# Disable NetBIOS over TCP/IP on all adapters via WMI (0=EnableViaDhcp, 1=Enabled, 2=Disabled)
$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
foreach ($a in $adapters) { $a.SetTCPIPNetBIOS(2) 2>$null }
# Also set registry fallback for new adapters
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters\\Interfaces" /f 2>nul`,
    disable: `$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
foreach ($a in $adapters) { $a.SetTCPIPNetBIOS(0) 2>$null }`,
  },

  "Disable SMBv1 Protocol": {
    requiresAdmin: true,
    enable: `Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force -ErrorAction SilentlyContinue
Set-SmbClientConfiguration -EnableBandwidthThrottling 0 -EnableLargeMtu 1 -Force -ErrorAction SilentlyContinue
Disable-WindowsOptionalFeature -Online -FeatureName smb1protocol -NoRestart -ErrorAction SilentlyContinue
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /t REG_DWORD /d 0 /f`,
    disable: `Set-SmbServerConfiguration -EnableSMB1Protocol $true -Force -ErrorAction SilentlyContinue
reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" /v SMB1 /f 2>nul`,
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
    enable: `netsh int tcp set global rss=enabled 2>nul
Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object {
  Enable-NetAdapterRss -Name $_.Name -ErrorAction SilentlyContinue
}`,
    disable: `netsh int tcp set global rss=disabled 2>nul`,
  },

  "Disable Delivery Optimization Service": {
    requiresAdmin: true,
    enable: `Set-Service -Name DoSvc -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name DoSvc -Force -ErrorAction SilentlyContinue
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f`,
    disable: `Set-Service -Name DoSvc -StartupType Automatic -ErrorAction SilentlyContinue
reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /f 2>nul`,
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
    disable: `reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" /v EnableMulticast /f 2>nul`,
  },

  "Disable mDNS Multicast": {
    requiresAdmin: true,
    enable: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableMDNS /t REG_DWORD /d 0 /f`,
    disable: `reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v EnableMDNS /f 2>nul`,
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
  lines.push('Write-Host "Press any key to exit..." -ForegroundColor Gray');
  lines.push("$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')");

  return lines.join("\n");
}
