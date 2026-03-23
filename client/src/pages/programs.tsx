import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, Trash2, Loader2, AlertTriangle, SortAsc, HardDrive, X,
  Store, Globe, Archive, Code2, FileText, FolderOpen, Gamepad2, Music,
  MessageSquare, Cloud, Shield, Wrench, Download, ChevronDown, ChevronUp,
  RefreshCcw, Monitor, Box, Check, Calendar, Building2, ExternalLink,
  Square, SquareCheck, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { openUrl } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type WinApp = { name: string; pkg: string };
type WinCap = { name: string; cap: string };
type WinFeat = { name: string; feature: string };
type ExtApp = { name: string; id: string };
type ExtCategory = { category: string; icon: React.ElementType; apps: ExtApp[] };
type SortKey = "name" | "size" | "publisher" | "date";
type TabKey = "winApps" | "external" | "allPrograms";
type InstalledProgram = {
  name: string; version: string; publisher: string; installDate: string;
  sizeMB: number; uninstallString: string; quietUninstall: string;
  isMsi: boolean; msiGuid: string; isAppx: boolean;
  packageFamilyName: string; installLocation: string;
};
type ProgramsResult = { programs: InstalledProgram[]; total: number; totalSizeMB: number };

// ─── Static Windows Apps Data ─────────────────────────────────────────────────
const WINDOWS_APPS: WinApp[] = [
  { name: "3D Viewer", pkg: "Microsoft.Microsoft3DViewer" },
  { name: "Alarms & Clock", pkg: "Microsoft.WindowsAlarms" },
  { name: "Bing Search", pkg: "Microsoft.BingSearch" },
  { name: "Calculator", pkg: "Microsoft.WindowsCalculator" },
  { name: "Camera", pkg: "Microsoft.WindowsCamera" },
  { name: "Clipchamp", pkg: "Clipchamp.Clipchamp" },
  { name: "Copilot", pkg: "Microsoft.Windows.Ai.Copilot.Provider" },
  { name: "Cortana", pkg: "Microsoft.549981C3F5F10" },
  { name: "Dev Home", pkg: "Microsoft.Windows.DevHome" },
  { name: "Feedback Hub", pkg: "Microsoft.WindowsFeedbackHub" },
  { name: "Get Help", pkg: "Microsoft.GetHelp" },
  { name: "Mail and Calendar", pkg: "microsoft.windowscommunicationsapps" },
  { name: "Maps", pkg: "Microsoft.WindowsMaps" },
  { name: "Media Player", pkg: "Microsoft.ZuneMusic" },
  { name: "Microsoft Edge", pkg: "Microsoft.MicrosoftEdge.Stable" },
  { name: "Microsoft Family Safety", pkg: "MicrosoftCorporationII.MicrosoftFamily" },
  { name: "Microsoft News", pkg: "Microsoft.BingNews" },
  { name: "Microsoft Store", pkg: "Microsoft.WindowsStore" },
  { name: "Microsoft Teams", pkg: "MSTeams" },
  { name: "Mixed Reality Portal", pkg: "Microsoft.MixedReality.Portal" },
  { name: "Movies & TV", pkg: "Microsoft.ZuneVideo" },
  { name: "MS 365 Copilot", pkg: "Microsoft.MicrosoftOfficeHub" },
  { name: "MSN Weather", pkg: "Microsoft.BingWeather" },
  { name: "Notepad", pkg: "Microsoft.WindowsNotepad" },
  { name: "OneDrive", pkg: "Microsoft.OneDriveSync" },
  { name: "OneNote", pkg: "Microsoft.Office.OneNote" },
  { name: "Outlook for Windows", pkg: "Microsoft.OutlookForWindows" },
  { name: "Paint", pkg: "Microsoft.Paint" },
  { name: "Paint 3D", pkg: "Microsoft.MSPaint" },
  { name: "People", pkg: "Microsoft.People" },
  { name: "Phone Link", pkg: "Microsoft.YourPhone" },
  { name: "Photos", pkg: "Microsoft.Windows.Photos" },
  { name: "Power Automate", pkg: "Microsoft.PowerAutomateDesktop" },
  { name: "Quick Assist", pkg: "MicrosoftCorporationII.QuickAssist" },
  { name: "Skype", pkg: "Microsoft.SkypeApp" },
  { name: "Snipping Tool", pkg: "Microsoft.ScreenSketch" },
  { name: "Solitaire Collection", pkg: "Microsoft.MicrosoftSolitaireCollection" },
  { name: "Sound Recorder", pkg: "Microsoft.WindowsSoundRecorder" },
  { name: "Sticky Notes", pkg: "Microsoft.MicrosoftStickyNotes" },
  { name: "Terminal", pkg: "Microsoft.WindowsTerminal" },
  { name: "Tips", pkg: "Microsoft.Getstarted" },
  { name: "To Do: Lists", pkg: "Microsoft.Todos" },
  { name: "Xbox", pkg: "Microsoft.GamingApp" },
  { name: "Xbox Game Bar", pkg: "Microsoft.XboxGamingOverlay" },
  { name: "Xbox Game Bar Plugin", pkg: "Microsoft.XboxGameOverlay" },
  { name: "Xbox Identity Provider", pkg: "Microsoft.XboxIdentityProvider" },
  { name: "Xbox Live In-Game", pkg: "Microsoft.Xbox.TCUI" },
];

const WIN_CAPABILITIES: WinCap[] = [
  { name: "Internet Explorer", cap: "Browser.InternetExplorer~~~~0.0.11.0" },
  { name: "Notepad (Legacy)", cap: "Microsoft.Windows.Notepad~~~~0.0.1.0" },
  { name: "OpenSSH Client", cap: "OpenSSH.Client~~~~0.0.1.0" },
  { name: "OpenSSH Server", cap: "OpenSSH.Server~~~~0.0.1.0" },
  { name: "Paint (Legacy)", cap: "Microsoft.Windows.MSPaint~~~~0.0.1.0" },
  { name: "PowerShell ISE", cap: "Microsoft.Windows.PowerShell.ISE~~~~0.0.1.0" },
  { name: "Quick Assist (Legacy)", cap: "App.QuickAssist~~~~0.0.1.0" },
  { name: "Steps Recorder", cap: "App.StepsRecorder~~~~0.0.1.0" },
  { name: "Windows Media Player", cap: "Media.WindowsMediaPlayer~~~~0.0.12.0" },
  { name: "WordPad", cap: "Microsoft.Windows.WordPad~~~~0.0.1.0" },
];

const WIN_FEATURES: WinFeat[] = [
  { name: ".NET Framework 3.5", feature: "NetFx3" },
  { name: "Hyper-V", feature: "Microsoft-Hyper-V-All" },
  { name: "Hyper-V Management Tools", feature: "Microsoft-Hyper-V-Tools-All" },
  { name: "Recall", feature: "Recall" },
  { name: "Subsystem for Linux", feature: "Microsoft-Windows-Subsystem-Linux" },
  { name: "Windows Hypervisor Platform", feature: "HypervisorPlatform" },
  { name: "Windows Sandbox", feature: "Containers-DisposableClientVM" },
];

const EXTERNAL_CATEGORIES: ExtCategory[] = [
  {
    category: "Browsers", icon: Globe, apps: [
      { name: "Arc Browser", id: "TheBrowserCompany.Arc" },
      { name: "Brave", id: "Brave.Brave" },
      { name: "DuckDuckGo Browser", id: "DuckDuckGo.DesktopBrowser" },
      { name: "Google Chrome", id: "Google.Chrome" },
      { name: "LibreWolf", id: "LibreWolf.LibreWolf" },
      { name: "Mozilla Firefox", id: "Mozilla.Firefox" },
      { name: "Opera", id: "Opera.Opera" },
      { name: "Opera GX", id: "Opera.OperaGX" },
      { name: "Tor Browser", id: "TorProject.TorBrowser" },
      { name: "Vivaldi", id: "Vivaldi.Vivaldi" },
      { name: "Waterfox", id: "Waterfox.Waterfox" },
      { name: "Zen Browser", id: "Zen-Team.Zen-Browser.Specific" },
    ],
  },
  {
    category: "Compression", icon: Archive, apps: [
      { name: "7-Zip", id: "7zip.7zip" },
      { name: "NanaZip", id: "M2Team.NanaZip" },
      { name: "PeaZip", id: "Giorgiotani.Peazip" },
      { name: "WinRAR", id: "RARLab.WinRAR" },
    ],
  },
  {
    category: "Development", icon: Code2, apps: [
      { name: "Git", id: "Git.Git" },
      { name: "GitHub Desktop", id: "GitHub.GitHubDesktop" },
      { name: "Node.js LTS", id: "OpenJS.NodeJS.LTS" },
      { name: "Notepad++", id: "Notepad++.Notepad++" },
      { name: "Python 3", id: "Python.Python.3" },
      { name: "PuTTY", id: "PuTTY.PuTTY" },
      { name: "Visual Studio Code", id: "Microsoft.VisualStudioCode" },
      { name: "WinMerge", id: "WinMerge.WinMerge" },
      { name: "WinSCP", id: "WinSCP.WinSCP" },
    ],
  },
  {
    category: "Document Viewers", icon: FileText, apps: [
      { name: "Adobe Acrobat Reader DC", id: "Adobe.Acrobat.Reader.64-bit" },
      { name: "LibreOffice", id: "TheDocumentFoundation.LibreOffice" },
      { name: "ONLYOFFICE Desktop", id: "ONLYOFFICE.DesktopEditors" },
      { name: "OpenOffice", id: "Apache.OpenOffice" },
      { name: "SumatraPDF", id: "SumatraPDF.SumatraPDF" },
    ],
  },
  {
    category: "File & Disk Management", icon: FolderOpen, apps: [
      { name: "Advanced Renamer", id: "DenisKutlubaev.AdvancedRenamer" },
      { name: "Crystal Disk Info", id: "CrystalDewWorld.CrystalDiskInfo" },
      { name: "Everything", id: "voidtools.Everything" },
      { name: "Rufus", id: "Rufus.Rufus" },
      { name: "TeraCopy", id: "CodeSector.TeraCopy" },
      { name: "TreeSize Free", id: "JAMSoftware.TreeSize.Free" },
      { name: "WinDirStat", id: "WinDirStat.WinDirStat" },
      { name: "WizTree", id: "AntibodySoftware.WizTree" },
    ],
  },
  {
    category: "Gaming", icon: Gamepad2, apps: [
      { name: "Epic Games Launcher", id: "EpicGames.EpicGamesLauncher" },
      { name: "GOG Galaxy", id: "GOG.Galaxy" },
      { name: "Steam", id: "Valve.Steam" },
    ],
  },
  {
    category: "Imaging & Design", icon: Monitor, apps: [
      { name: "Blender", id: "BlenderFoundation.Blender" },
      { name: "GIMP", id: "GIMP.GIMP" },
      { name: "Greenshot", id: "Greenshot.Greenshot" },
      { name: "ImageGlass", id: "DuyHoang-Tiger.ImageGlass" },
      { name: "Inkscape", id: "Inkscape.Inkscape" },
      { name: "IrfanView", id: "IrfanSkiljan.IrfanView" },
      { name: "Krita", id: "KDE.Krita" },
      { name: "Paint.NET", id: "dotPDN.PaintDotNet" },
      { name: "ShareX", id: "ShareX.ShareX" },
    ],
  },
  {
    category: "Messaging & Email", icon: MessageSquare, apps: [
      { name: "Discord", id: "Discord.Discord" },
      { name: "Element", id: "Element.Element" },
      { name: "Mozilla Thunderbird", id: "Mozilla.Thunderbird" },
      { name: "Signal", id: "OpenWhisperSystems.Signal" },
      { name: "Slack", id: "SlackTechnologies.Slack" },
      { name: "Telegram Desktop", id: "Telegram.TelegramDesktop" },
      { name: "WhatsApp", id: "WhatsApp.WhatsApp" },
      { name: "Zoom", id: "Zoom.Zoom" },
    ],
  },
  {
    category: "Multimedia", icon: Music, apps: [
      { name: "Audacity", id: "Audacity.Audacity" },
      { name: "foobar2000", id: "PeterPawlowski.foobar2000" },
      { name: "HandBrake", id: "HandBrake.HandBrake" },
      { name: "iTunes", id: "Apple.iTunes" },
      { name: "K-Lite Codec Pack", id: "CodecGuide.K-LiteCodecPackMega" },
      { name: "MPC-HC", id: "clsid2.mpc-hc" },
      { name: "MusicBee", id: "MusicBee.MusicBee" },
      { name: "OBS Studio", id: "OBSProject.OBSStudio" },
      { name: "PotPlayer", id: "Daum.PotPlayer" },
      { name: "Spotify", id: "Spotify.Spotify" },
      { name: "VLC Media Player", id: "VideoLAN.VLC" },
    ],
  },
  {
    category: "Online Storage & Backup", icon: Cloud, apps: [
      { name: "Dropbox", id: "Dropbox.Dropbox" },
      { name: "FreeFileSync", id: "FreeFileSync.FreeFileSync" },
      { name: "Google Drive", id: "Google.GoogleDrive" },
      { name: "Nextcloud Desktop", id: "Nextcloud.NextcloudDesktop" },
      { name: "Proton Drive", id: "ProtonTechnologies.ProtonDrive" },
    ],
  },
  {
    category: "Privacy & Security", icon: Shield, apps: [
      { name: "Bitwarden", id: "Bitwarden.Bitwarden" },
      { name: "Malwarebytes", id: "Malwarebytes.Malwarebytes" },
      { name: "Malwarebytes AdwCleaner", id: "Malwarebytes.AdwCleaner" },
      { name: "O&O ShutUp10++", id: "OO-Software.ShutUp10" },
      { name: "OnionShare", id: "OnionShare.OnionShare" },
      { name: "Proton VPN", id: "ProtonTechnologies.ProtonVPN" },
    ],
  },
  {
    category: "System Utilities", icon: Wrench, apps: [
      { name: "CCleaner", id: "Piriform.CCleaner" },
      { name: "CPU-Z", id: "CPUID.CPU-Z" },
      { name: "CrystalDiskMark", id: "CrystalDewWorld.CrystalDiskMark" },
      { name: "GPU-Z", id: "TechPowerUp.GPU-Z" },
      { name: "HWiNFO64", id: "REALiX.HWiNFO" },
      { name: "MSI Afterburner", id: "Guru3D.MSIAfterburner" },
      { name: "OpenRGB", id: "OpenRGBdotorg.OpenRGB" },
      { name: "Oracle VirtualBox", id: "Oracle.VirtualBox" },
      { name: "UniGetUI", id: "MartiCliment.UniGetUI" },
      { name: "Wise Registry Cleaner", id: "WiseCleaner.WiseRegistryCleaner" },
    ],
  },
  {
    category: "Runtimes & Dependencies", icon: Box, apps: [
      { name: ".NET Runtime 6", id: "Microsoft.DotNet.Runtime.6" },
      { name: ".NET Runtime 7", id: "Microsoft.DotNet.Runtime.7" },
      { name: ".NET Runtime 8", id: "Microsoft.DotNet.Runtime.8" },
      { name: ".NET Runtime 9", id: "Microsoft.DotNet.Runtime.9" },
      { name: "DirectX Runtime", id: "Microsoft.DirectX" },
      { name: "Java Runtime (JRE)", id: "Oracle.JavaRuntimeEnvironment" },
      { name: "Visual C++ 2015-2022 x64", id: "Microsoft.VCRedist.x64.14" },
      { name: "Visual C++ 2015-2022 x86", id: "Microsoft.VCRedist.x86.14" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(mb: number): string {
  if (!mb || mb === 0) return "—";
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function fmtDate(raw: string): string {
  if (!raw || raw.length < 8) return "—";
  const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1] || m} ${d}, ${y}`;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────
function StatusDot({ installed }: { installed: boolean | null }) {
  if (installed === null) {
    return <div className="w-2 h-2 rounded-full shrink-0 animate-pulse bg-secondary/40" />;
  }
  return (
    <div
      className="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
      style={{
        background: installed ? "hsl(142 76% 40%)" : "hsl(0 0% 25%)",
        boxShadow: installed ? "0 0 6px hsl(142 76% 36% / 0.7)" : "none",
      }}
    />
  );
}

function ItemCB({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-[15px] h-[15px] rounded-sm shrink-0 flex items-center justify-center transition-all duration-150"
      style={{
        border: checked ? "1.5px solid hsl(var(--primary))" : "1.5px solid hsl(var(--border) / 0.4)",
        background: checked ? "hsl(var(--primary))" : "transparent",
      }}
    >
      {checked && <Check className="h-2 w-2 text-black" strokeWidth={3.5} />}
    </button>
  );
}

function BulkBar({
  totalSelected, totalInstalled, totalNotInstalled, onSelectAll,
  onSelectInstalled, onSelectNotInstalled, onDeselectAll,
  onInstallSelected, onUninstallSelected, isActing, loading,
}: {
  totalSelected: number; totalInstalled: number; totalNotInstalled: number;
  onSelectAll: () => void; onSelectInstalled: () => void; onSelectNotInstalled: () => void;
  onDeselectAll: () => void; onInstallSelected: () => void; onUninstallSelected: () => void;
  isActing: boolean; loading: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-5 py-2.5 border-b border-border/40"
      style={{ background: "hsl(var(--card) / 0.5)" }}
    >
      {/* Selection checkboxes */}
      <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground/60">
        <div
          onClick={totalSelected > 0 ? onDeselectAll : onSelectAll}
          className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors cursor-pointer select-none"
          data-testid="button-select-all"
        >
          <ItemCB checked={totalSelected > 0} onChange={() => {}} />
          {totalSelected > 0 ? `${totalSelected} selected` : "Select All"}
        </div>
        <span className="text-border/50">|</span>
        <div onClick={onSelectInstalled} className="cursor-pointer hover:text-foreground/80 transition-colors select-none">
          Select Installed
        </div>
        <span className="text-border/50">|</span>
        <div onClick={onSelectNotInstalled} className="cursor-pointer hover:text-foreground/80 transition-colors select-none">
          Select Not Installed
        </div>
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <Button
        size="sm"
        onClick={onInstallSelected}
        disabled={isActing || loading || totalSelected === 0}
        data-testid="button-install-selected"
        className="h-7 px-3 text-[11px] font-bold gap-1.5"
        style={{
          background: totalSelected > 0 ? "hsl(var(--primary) / 0.15)" : "transparent",
          border: "1px solid hsl(var(--primary) / 0.3)",
          color: totalSelected > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
        }}
      >
        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        Install Selected
      </Button>
      <Button
        size="sm"
        onClick={onUninstallSelected}
        disabled={isActing || loading || totalSelected === 0}
        data-testid="button-uninstall-selected"
        className="h-7 px-3 text-[11px] font-bold gap-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400/60 hover:text-red-300 border border-red-900/30"
      >
        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        Uninstall Selected
      </Button>
    </div>
  );
}

// ─── Windows Apps & Features Tab ──────────────────────────────────────────────
function WinAppsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState("");

  const { data: scanData, isLoading: scanLoading } = useQuery<{
    installedApps: string[]; capabilities: Record<string, boolean>; features: Record<string, boolean>;
  }>({
    queryKey: ["/api/software/win-scan"],
    staleTime: 1000 * 60 * 5,
  });

  const installedAppSet = useMemo(() => new Set((scanData?.installedApps ?? []).map(n => n.toLowerCase())), [scanData]);
  const capsMap = scanData?.capabilities ?? {};
  const featsMap = scanData?.features ?? {};

  function isAppInstalled(pkg: string): boolean | null {
    if (!scanData) return null;
    return Array.from(installedAppSet).some(n => n.toLowerCase().includes(pkg.toLowerCase()) || pkg.toLowerCase().includes(n));
  }
  function isCapInstalled(cap: string): boolean | null {
    if (!scanData) return null;
    const key = Object.keys(capsMap).find(k => k.toLowerCase().startsWith(cap.split("~~~~")[0].toLowerCase()));
    return key ? capsMap[key] : false;
  }
  function isFeatInstalled(feature: string): boolean | null {
    if (!scanData) return null;
    return featsMap[feature.toLowerCase()] ?? false;
  }

  const q = search.toLowerCase();
  const filteredApps = WINDOWS_APPS.filter(a => !q || a.name.toLowerCase().includes(q));
  const filteredCaps = WIN_CAPABILITIES.filter(c => !q || c.name.toLowerCase().includes(q));
  const filteredFeats = WIN_FEATURES.filter(f => !q || f.name.toLowerCase().includes(q));

  const allKeys = [
    ...WINDOWS_APPS.map(a => `app:${a.pkg}`),
    ...WIN_CAPABILITIES.map(c => `cap:${c.cap}`),
    ...WIN_FEATURES.map(f => `feat:${f.feature}`),
  ];

  function toggle(key: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  const winActionMutation = useMutation({
    mutationFn: (body: { type: string; name: string; action: "install" | "uninstall" }) =>
      apiRequest("POST", "/api/software/win-action", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/software/win-scan"] });
    },
  });

  async function handleBulkAction(action: "install" | "uninstall") {
    if (selected.size === 0) return;
    setActing(true);
    let successCount = 0;
    for (const key of selected) {
      try {
        const [type, name] = key.split(":");
        await winActionMutation.mutateAsync({ type, name, action });
        successCount++;
      } catch {}
    }
    setActing(false);
    setSelected(new Set());
    toast({
      title: `${action === "install" ? "Installed" : "Uninstalled"} ${successCount}/${selected.size}`,
      description: `Bulk ${action} completed.`,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/software/win-scan"] });
  }

  function selectAll() { setSelected(new Set(allKeys)); }
  function deselectAll() { setSelected(new Set()); }
  function selectInstalled() {
    const keys: string[] = [];
    WINDOWS_APPS.forEach(a => { if (isAppInstalled(a.pkg)) keys.push(`app:${a.pkg}`); });
    WIN_CAPABILITIES.forEach(c => { if (isCapInstalled(c.cap)) keys.push(`cap:${c.cap}`); });
    WIN_FEATURES.forEach(f => { if (isFeatInstalled(f.feature)) keys.push(`feat:${f.feature}`); });
    setSelected(new Set(keys));
  }
  function selectNotInstalled() {
    const keys: string[] = [];
    WINDOWS_APPS.forEach(a => { if (!isAppInstalled(a.pkg)) keys.push(`app:${a.pkg}`); });
    WIN_CAPABILITIES.forEach(c => { if (!isCapInstalled(c.cap)) keys.push(`cap:${c.cap}`); });
    WIN_FEATURES.forEach(f => { if (!isFeatInstalled(f.feature)) keys.push(`feat:${f.feature}`); });
    setSelected(new Set(keys));
  }

  function renderRow(name: string, pkg: string, keyPrefix: string) {
    const key = `${keyPrefix}:${pkg}`;
    const installed = keyPrefix === "app"
      ? isAppInstalled(pkg)
      : keyPrefix === "cap"
        ? isCapInstalled(pkg)
        : isFeatInstalled(pkg);
    return (
      <div
        key={key}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer"
        onClick={() => toggle(key)}
      >
        <ItemCB checked={selected.has(key)} onChange={() => toggle(key)} />
        <StatusDot installed={installed} />
        <span
          className="text-[12px] font-medium flex-1 truncate select-none"
          style={{ color: installed ? "hsl(var(--foreground) / 0.85)" : "hsl(var(--muted-foreground) / 0.5)" }}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Controls bar */}
      <BulkBar
        totalSelected={selected.size}
        totalInstalled={0}
        totalNotInstalled={0}
        onSelectAll={selectAll}
        onSelectInstalled={selectInstalled}
        onSelectNotInstalled={selectNotInstalled}
        onDeselectAll={deselectAll}
        onInstallSelected={() => handleBulkAction("install")}
        onUninstallSelected={() => handleBulkAction("uninstall")}
        isActing={acting}
        loading={scanLoading}
      />

      {/* Search */}
      <div className="px-5 py-2 border-b border-border/30" style={{ background: "hsl(var(--card) / 0.3)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search apps, capabilities, features..."
            className="w-full pl-9 pr-8 py-1.5 text-[12px] rounded-lg bg-secondary/15 border border-border/30 focus:border-primary/40 focus:outline-none placeholder:text-muted-foreground/25 text-foreground/80"
            data-testid="input-winapps-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Windows Apps */}
        {filteredApps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary) / 0.7)" }} />
              <h3 className="font-black text-sm text-foreground/90">Windows Apps</h3>
              <div className="flex-1 h-[1px] bg-border/30 ml-1" />
              {!scanLoading && (
                <span className="text-[10px] font-mono text-muted-foreground/30">
                  {WINDOWS_APPS.filter(a => isAppInstalled(a.pkg)).length}/{WINDOWS_APPS.length} installed
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-0.5">
              {filteredApps.map(app => renderRow(app.name, app.pkg, "app"))}
            </div>
          </div>
        )}

        {/* Windows Capabilities */}
        {filteredCaps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary) / 0.7)" }} />
              <h3 className="font-black text-sm text-foreground/90">Windows Capabilities</h3>
              <div className="flex-1 h-[1px] bg-border/30 ml-1" />
            </div>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-0.5">
              {filteredCaps.map(cap => renderRow(cap.name, cap.cap, "cap"))}
            </div>
          </div>
        )}

        {/* Windows Optional Features */}
        {filteredFeats.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Box className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary) / 0.7)" }} />
              <h3 className="font-black text-sm text-foreground/90">Windows Optional Features</h3>
              <div className="flex-1 h-[1px] bg-border/30 ml-1" />
            </div>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-0.5">
              {filteredFeats.map(feat => renderRow(feat.name, feat.feature, "feat"))}
            </div>
          </div>
        )}

        {filteredApps.length === 0 && filteredCaps.length === 0 && filteredFeats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-10 w-10 text-muted-foreground/10 mb-3" />
            <p className="text-sm font-semibold text-foreground/30">No results for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── External Software Tab ────────────────────────────────────────────────────
function ExternalTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(EXTERNAL_CATEGORIES.map(c => c.category)));
  const [search, setSearch] = useState("");

  const { data: extData, isLoading: extLoading } = useQuery<{ wingetOutput: string }>({
    queryKey: ["/api/software/ext-scan"],
    staleTime: 1000 * 60 * 5,
  });

  const wingetOutput = (extData?.wingetOutput ?? "").toLowerCase();

  function isInstalled(id: string): boolean | null {
    if (!extData) return null;
    return wingetOutput.includes(id.toLowerCase());
  }

  const allKeys = EXTERNAL_CATEGORIES.flatMap(cat => cat.apps.map(a => a.id));

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleCat(cat: string) {
    setExpandedCats(prev => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  }

  const extActionMutation = useMutation({
    mutationFn: (body: { id: string; action: "install" | "uninstall" }) =>
      apiRequest("POST", "/api/software/ext-action", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/software/ext-scan"] });
    },
  });

  async function handleSingleAction(id: string, name: string, action: "install" | "uninstall") {
    setActing(id);
    try {
      await extActionMutation.mutateAsync({ id, action });
      toast({ title: action === "install" ? "Installed" : "Uninstalled", description: `${name} ${action}ed successfully.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Operation failed.", variant: "destructive" });
    }
    setActing(null);
  }

  async function handleBulkAction(action: "install" | "uninstall") {
    if (selected.size === 0) return;
    setBulkActing(true);
    let successCount = 0;
    for (const id of selected) {
      try {
        await extActionMutation.mutateAsync({ id, action });
        successCount++;
      } catch {}
    }
    setBulkActing(false);
    setSelected(new Set());
    toast({
      title: `${action === "install" ? "Installed" : "Uninstalled"} ${successCount}/${selected.size}`,
      description: `Bulk ${action} completed.`,
    });
  }

  function selectAll() { setSelected(new Set(allKeys)); }
  function deselectAll() { setSelected(new Set()); }
  function selectInstalled() {
    const keys = allKeys.filter(id => isInstalled(id));
    setSelected(new Set(keys));
  }
  function selectNotInstalled() {
    const keys = allKeys.filter(id => !isInstalled(id));
    setSelected(new Set(keys));
  }

  const q = search.toLowerCase();
  const filteredCats = EXTERNAL_CATEGORIES.map(cat => ({
    ...cat,
    apps: cat.apps.filter(a => !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q)),
  })).filter(cat => cat.apps.length > 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <BulkBar
        totalSelected={selected.size}
        totalInstalled={0}
        totalNotInstalled={0}
        onSelectAll={selectAll}
        onSelectInstalled={selectInstalled}
        onSelectNotInstalled={selectNotInstalled}
        onDeselectAll={deselectAll}
        onInstallSelected={() => handleBulkAction("install")}
        onUninstallSelected={() => handleBulkAction("uninstall")}
        isActing={bulkActing}
        loading={extLoading}
      />

      <div className="px-5 py-2 border-b border-border/30" style={{ background: "hsl(var(--card) / 0.3)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search software..."
            className="w-full pl-9 pr-8 py-1.5 text-[12px] rounded-lg bg-secondary/15 border border-border/30 focus:border-primary/40 focus:outline-none placeholder:text-muted-foreground/25 text-foreground/80"
            data-testid="input-ext-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {extLoading && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border/30 bg-secondary/10">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
            <span className="text-[12px] text-muted-foreground/50">Scanning installed software via winget...</span>
          </div>
        )}

        {filteredCats.map(cat => {
          const Icon = cat.icon;
          const isExpanded = expandedCats.has(cat.category);
          const installedCount = cat.apps.filter(a => isInstalled(a.id)).length;

          return (
            <div
              key={cat.category}
              className="rounded-xl overflow-hidden border border-border/40"
              style={{ background: "hsl(var(--card) / 0.4)" }}
            >
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.category)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <span className="font-bold text-[12px] text-foreground/80 flex-1 text-left">{cat.category}</span>
                {!extLoading && (
                  <span className="text-[10px] font-mono text-muted-foreground/30 mr-2">
                    {installedCount}/{cat.apps.length}
                  </span>
                )}
                {isExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                }
              </button>

              {/* Category apps */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="border-t border-border/30 grid grid-cols-3 xl:grid-cols-4 gap-0 px-2 py-2">
                      {cat.apps.map(app => {
                        const installed = isInstalled(app.id);
                        const isThisActing = acting === app.id;
                        return (
                          <div
                            key={app.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer group"
                            onClick={() => toggle(app.id)}
                          >
                            <ItemCB checked={selected.has(app.id)} onChange={() => toggle(app.id)} />
                            <StatusDot installed={installed} />
                            <span
                              className="text-[11.5px] font-medium flex-1 truncate select-none"
                              style={{ color: installed ? "hsl(var(--foreground) / 0.85)" : "hsl(var(--muted-foreground) / 0.45)" }}
                            >
                              {app.name}
                            </span>
                            {/* Quick action buttons on hover */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {installed ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSingleAction(app.id, app.name, "uninstall"); }}
                                  disabled={isThisActing || bulkActing}
                                  className="p-0.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                  title={`Uninstall ${app.name}`}
                                >
                                  {isThisActing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSingleAction(app.id, app.name, "install"); }}
                                  disabled={isThisActing || bulkActing}
                                  className="p-0.5 rounded transition-colors"
                                  style={{ color: "hsl(var(--primary) / 0.5)" }}
                                  title={`Install ${app.name}`}
                                >
                                  {isThisActing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredCats.length === 0 && q && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-10 w-10 text-muted-foreground/10 mb-3" />
            <p className="text-sm font-semibold text-foreground/30">No results for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── All Programs Tab ─────────────────────────────────────────────────────────
function AllProgramsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<"all" | "win32" | "store">("win32");
  const [confirmProg, setConfirmProg] = useState<InstalledProgram | null>(null);
  const [activeUninstall, setActiveUninstall] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ProgramsResult>({
    queryKey: ["/api/programs"],
    staleTime: 1000 * 60 * 5,
  });

  const uninstallMutation = useMutation({
    mutationFn: (prog: InstalledProgram) =>
      apiRequest("POST", "/api/programs/uninstall", {
        uninstallString: prog.uninstallString,
        quietUninstall: prog.quietUninstall,
        isMsi: prog.isMsi,
        msiGuid: prog.msiGuid,
        programName: prog.name,
        isAppx: prog.isAppx,
        packageFamilyName: prog.packageFamilyName,
      }),
    onMutate: (prog) => setActiveUninstall(prog.name),
    onSuccess: (_d, prog) => {
      setActiveUninstall(null);
      toast({ title: "Uninstalled", description: `${prog.name} removed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: (err: any) => {
      setActiveUninstall(null);
      toast({ title: "Uninstall failed", description: err?.message || "Could not remove the program.", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    let progs = data?.programs ?? [];
    if (filter === "win32") progs = progs.filter(p => !p.isAppx);
    if (filter === "store") progs = progs.filter(p => p.isAppx);
    const q = search.toLowerCase().trim();
    const out = q ? progs.filter(p => p.name.toLowerCase().includes(q) || (p.publisher || "").toLowerCase().includes(q)) : progs;
    return [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return (b.sizeMB || 0) - (a.sizeMB || 0);
      if (sort === "publisher") return (a.publisher || "").localeCompare(b.publisher || "");
      if (sort === "date") return (b.installDate || "").localeCompare(a.installDate || "");
      return 0;
    });
  }, [data, search, sort, filter]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search + controls */}
      <div className="shrink-0 px-5 py-3 border-b border-border/40" style={{ background: "hsl(var(--card) / 0.5)" }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/35 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search programs or publishers..."
              data-testid="input-programs-search"
              className="pl-9 pr-8 h-9 text-[12px] bg-secondary/15 border-border/40 focus:border-primary/40 placeholder:text-muted-foreground/25"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger data-testid="select-programs-filter" className="w-28 h-9 text-[11px] bg-secondary/15 border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              <SelectItem value="win32">Win32</SelectItem>
              <SelectItem value="store">Store</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
            <SelectTrigger data-testid="select-programs-sort" className="w-36 h-9 text-[11px] bg-secondary/15 border-border/40">
              <SortAsc className="h-3 w-3 text-muted-foreground/40 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="size">Largest First</SelectItem>
              <SelectItem value="publisher">Publisher</SelectItem>
              <SelectItem value="date">Install Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isLoading && data && (
          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground/35">
            <span>{data.programs.filter(p => !p.isAppx).length} Win32</span>
            <span>·</span>
            <span>{data.programs.filter(p => p.isAppx).length} Store</span>
            <span>·</span>
            <span>{(() => { const mb = data.totalSizeMB; return mb >= 1024 ? `${(mb/1024).toFixed(1)} GB` : `${mb} MB`; })()} total</span>
            {search && <><span>·</span><span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span></>}
          </div>
        )}
      </div>

      {/* Program list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/30 bg-card/60 overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/30 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-3/4 rounded bg-secondary/40 animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-secondary/25 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <div className="flex-1 h-7 rounded-md bg-secondary/30 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {search ? (
              <>
                <Search className="h-10 w-10 text-muted-foreground/10 mb-4" />
                <p className="text-sm font-semibold text-foreground/30">No programs match "{search}"</p>
              </>
            ) : (
              <>
                <Package className="h-10 w-10 text-muted-foreground/10 mb-4" />
                <p className="text-sm font-semibold text-foreground/30">No programs detected</p>
                <p className="text-xs text-muted-foreground/25 mt-1">Only works on Windows</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((prog, i) => {
              const uninstalling = activeUninstall === prog.name;
              const letter = (prog.name || "?")[0].toUpperCase();
              return (
                <motion.div
                  key={prog.name + prog.version}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.15 }}
                >
                  <div
                    className="flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden group relative transition-all duration-200"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px hsl(var(--primary) / 0.08), 0 4px 16px rgba(0,0,0,0.35)";
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.28)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.6)";
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-base select-none"
                        style={{
                          background: "hsl(var(--primary) / 0.12)",
                          border: "1px solid hsl(var(--primary) / 0.22)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        {letter}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-[12px] text-foreground leading-tight truncate" title={prog.name}>{prog.name}</p>
                          {prog.isAppx && (
                            <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary) / 0.7)", border: "1px solid hsl(var(--primary) / 0.18)" }}>
                              Store
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">{prog.publisher || "Unknown publisher"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-2">
                      {prog.version && (
                        <span className="text-[9px] font-mono font-semibold text-primary/60 bg-primary/8 border border-primary/12 px-1.5 py-0.5 rounded">
                          v{prog.version}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground/35">
                        <HardDrive className="h-2.5 w-2.5" />{fmtSize(prog.sizeMB)}
                      </span>
                      {prog.installDate && (
                        <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground/35">
                          <Calendar className="h-2.5 w-2.5" />{fmtDate(prog.installDate)}
                        </span>
                      )}
                    </div>
                    <div className="mx-4 h-[1px] bg-border/25 mb-3" />
                    <div className="px-3 pb-3">
                      <Button
                        size="sm"
                        disabled={uninstalling}
                        onClick={() => setConfirmProg(prog)}
                        data-testid={`button-uninstall-${i}`}
                        className="w-full h-7 text-[11px] font-bold gap-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400/60 hover:text-red-300 border border-red-900/25 hover:border-red-800/40 transition-all"
                      >
                        {uninstalling ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
                        {uninstalling ? "Removing..." : "Uninstall"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Uninstall confirm */}
      <AlertDialog open={!!confirmProg} onOpenChange={open => { if (!open) setConfirmProg(null); }}>
        <AlertDialogContent className="border-border/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-black">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(0 80% 30% / 0.3)", border: "1px solid hsl(0 70% 40% / 0.4)" }}>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              </div>
              Uninstall Program
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/60 text-[12.5px] leading-relaxed">
              Are you sure you want to uninstall{" "}
              <span className="text-foreground/80 font-semibold">{confirmProg?.name}</span>?
              <br />
              <span className="text-red-400/70 text-[11px]">This action cannot be undone from this view. Use the Windows Apps tab to reinstall built-in apps.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-uninstall-cancel" className="h-8 text-[12px] border-border/40">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-uninstall-confirm"
              onClick={() => { if (confirmProg) { uninstallMutation.mutate(confirmProg); setConfirmProg(null); } }}
              className="h-8 text-[12px] font-semibold bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-800/60"
            >
              <Trash2 className="h-3 w-3 mr-1.5" /> Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Programs Page ───────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "winApps", label: "Windows Apps & Features", icon: Store },
  { key: "external", label: "External Software", icon: Globe },
  { key: "allPrograms", label: "All Programs", icon: Package },
];

export default function Programs() {
  const [tab, setTab] = useState<TabKey>("winApps");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* ── Page Header ── */}
      <div
        className="shrink-0 px-6 pt-5 pb-0 border-b border-border/50"
        style={{
          background: "hsl(var(--card) / 0.4)",
          borderImage: "linear-gradient(to right, transparent, hsl(var(--primary)/0.15), transparent) 1",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--primary) / 0.12)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.15)",
            }}
          >
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-black text-lg text-foreground tracking-tight leading-none">Software & Apps</h1>
            <p className="text-[11px] text-muted-foreground/40 mt-0.5 font-mono">Manage Windows apps and install software</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-0">
          {TABS.map((t, idx) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                data-testid={`tab-${t.key}`}
                className="relative flex items-center gap-2 px-5 py-2.5 text-[12.5px] font-bold transition-all duration-150"
                style={{
                  color: active ? "hsl(var(--foreground) / 0.95)" : "hsl(var(--muted-foreground) / 0.45)",
                  background: active ? "hsl(var(--card) / 0.6)" : "transparent",
                  borderTopLeftRadius: "10px",
                  borderTopRightRadius: "10px",
                  border: active ? "1px solid hsl(var(--border) / 0.5)" : "1px solid transparent",
                  borderBottom: active ? "1px solid hsl(var(--card))" : "1px solid transparent",
                  marginBottom: active ? "-1px" : "0",
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 inset-x-0 h-[2px]"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            {tab === "winApps" && <WinAppsTab />}
            {tab === "external" && <ExternalTab />}
            {tab === "allPrograms" && <AllProgramsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
