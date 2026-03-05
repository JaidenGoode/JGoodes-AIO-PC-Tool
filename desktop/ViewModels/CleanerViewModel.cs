using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using JGoodeAIO.Services;
using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace JGoodeAIO.ViewModels;

public record CleanCategory(string Name, string Description, string Icon, long SizeMb);
public record CleanResult(string Category, bool Success, string Message);

public partial class CleanerViewModel : ViewModelBase
{
    [ObservableProperty] private string _statusMessage = "Click Scan to check for junk files.";
    [ObservableProperty] private bool _isScanning;
    [ObservableProperty] private bool _isCleaning;
    [ObservableProperty] private bool _hasScanned;
    [ObservableProperty] private long _totalSizeMb;
    [ObservableProperty] private ObservableCollection<CleanCategory> _categories = new();
    [ObservableProperty] private ObservableCollection<CleanResult> _results = new();

    private static readonly (string name, string desc, string icon, Func<long> size)[] CleanTargets =
    [
        ("Temp Files", "Windows temporary files (%TEMP% and Windows\\Temp)", "DeleteForever",
            () => GetDirSizeMb(Path.GetTempPath()) + GetDirSizeMb(@"C:\Windows\Temp")),
        ("Prefetch Cache", "Windows prefetch files that speed up app launches", "Speed",
            () => GetDirSizeMb(@"C:\Windows\Prefetch")),
        ("Thumbnail Cache", "Explorer thumbnail image cache", "Image",
            () => GetDirSizeMb(Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                @"Microsoft\Windows\Explorer"))),
        ("Windows Update Cache", "Leftover Windows Update download files", "SystemUpdate",
            () => GetDirSizeMb(@"C:\Windows\SoftwareDistribution\Download")),
        ("Recycle Bin", "Files waiting for permanent deletion", "Delete",
            () => 0L),
        ("Event Logs", "Windows event log files (clears system/application logs)", "Assignment",
            () => GetDirSizeMb(@"C:\Windows\System32\winevt\Logs")),
    ];

    [RelayCommand]
    private async Task ScanAsync()
    {
        IsScanning = true;
        StatusMessage = "Scanning for junk files...";
        Categories.Clear();

        await Task.Run(() =>
        {
            foreach (var (name, desc, icon, sizeFn) in CleanTargets)
            {
                long mb = 0;
                try { mb = sizeFn(); } catch { }
                Avalonia.Threading.Dispatcher.UIThread.Post(() =>
                    Categories.Add(new CleanCategory(name, desc, icon, mb)));
            }
        });

        TotalSizeMb = Categories.Sum(c => c.SizeMb);
        HasScanned = true;
        IsScanning = false;
        StatusMessage = TotalSizeMb > 0
            ? $"Found {FormatSize(TotalSizeMb)} of junk files. Ready to clean."
            : "No significant junk files found.";
    }

    [RelayCommand]
    private async Task CleanAllAsync()
    {
        IsCleaning = true;
        Results.Clear();
        StatusMessage = "Cleaning...";

        var cmds = new[]
        {
            ("Temp Files",          @"Remove-Item -Path $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path 'C:\Windows\Temp\*' -Recurse -Force -ErrorAction SilentlyContinue"),
            ("Prefetch Cache",      @"Remove-Item -Path 'C:\Windows\Prefetch\*' -Force -ErrorAction SilentlyContinue"),
            ("Thumbnail Cache",     @"Stop-Process -Name explorer -Force; Remove-Item -Path '$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*' -Force -ErrorAction SilentlyContinue; Start-Process explorer"),
            ("Update Cache",        @"Stop-Service -Name wuauserv -Force; Remove-Item -Path 'C:\Windows\SoftwareDistribution\Download\*' -Recurse -Force -ErrorAction SilentlyContinue; Start-Service wuauserv"),
            ("Recycle Bin",         @"Clear-RecycleBin -Force -ErrorAction SilentlyContinue"),
            ("Event Logs",          @"Get-EventLog -List | ForEach-Object { Clear-EventLog -LogName $_.Log -ErrorAction SilentlyContinue }"),
        };

        foreach (var (name, cmd) in cmds)
        {
            var (ok, msg) = await PowerShellService.RunAsync(cmd);
            Results.Add(new CleanResult(name, ok, ok ? "Cleaned" : msg));
        }

        IsCleaning = false;
        StatusMessage = $"Cleaning complete. {Results.Count(r => r.Success)} / {Results.Count} tasks succeeded.";
    }

    [RelayCommand]
    private async Task FlushDnsAsync()
    {
        StatusMessage = "Flushing DNS cache...";
        var (ok, _) = await PowerShellService.RunAsync("Clear-DnsClientCache");
        StatusMessage = ok ? "DNS cache flushed successfully." : "DNS flush failed (may need admin).";
    }

    [RelayCommand]
    private async Task ResetNetworkAsync()
    {
        StatusMessage = "Resetting network stack — this may take a moment...";
        var cmd =
            "& netsh winsock reset | Out-Null; " +
            "& netsh int ip reset | Out-Null; " +
            "Clear-DnsClientCache; " +
            "Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Restart-NetAdapter -Confirm:$false";
        var (ok, _) = await PowerShellService.RunAsync(cmd);
        StatusMessage = ok
            ? "Network stack reset. A reboot is recommended."
            : "Network reset completed (some steps may need a reboot).";
    }

    private static long GetDirSizeMb(string path)
    {
        if (!Directory.Exists(path)) return 0;
        try
        {
            var size = new DirectoryInfo(path)
                .GetFiles("*", SearchOption.AllDirectories)
                .Sum(f => { try { return f.Length; } catch { return 0L; } });
            return size / 1_048_576;
        }
        catch { return 0; }
    }

    private static string FormatSize(long mb) =>
        mb >= 1024 ? $"{mb / 1024.0:F1} GB" : $"{mb} MB";
}
