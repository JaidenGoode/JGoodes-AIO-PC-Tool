using CommunityToolkit.Mvvm.ComponentModel;
using JGoodeAIO.Services;
using System;
using System.Threading.Tasks;
using Avalonia.Threading;

namespace JGoodeAIO.ViewModels;

public partial class DashboardViewModel : ViewModelBase, IDisposable
{
    private readonly HardwareService _hw = new();
    private readonly DispatcherTimer _timer;

    [ObservableProperty] private double _cpuPercent;
    [ObservableProperty] private double _ramPercent;
    [ObservableProperty] private double _diskPercent;
    [ObservableProperty] private double _gpuPercent;

    [ObservableProperty] private string _cpuLabel = "0%";
    [ObservableProperty] private string _ramLabel = "0% · 0 / 0 GB";
    [ObservableProperty] private string _diskLabel = "0%";
    [ObservableProperty] private string _gpuLabel = "N/A";

    [ObservableProperty] private string _cpuModel = "Loading...";
    [ObservableProperty] private string _osVersion = "";
    [ObservableProperty] private string _diskTotal = "";
    [ObservableProperty] private string _diskFree = "";
    [ObservableProperty] private string _gpuModel = "N/A";
    [ObservableProperty] private string _cpuTemp = "N/A";

    [ObservableProperty] private double _readMbps;
    [ObservableProperty] private double _writeMbps;

    [ObservableProperty] private bool _isLoading = true;

    public DashboardViewModel()
    {
        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(4) };
        _timer.Tick += async (_, _) => await RefreshAsync();
        _timer.Start();
        _ = RefreshAsync();
    }

    private async Task RefreshAsync()
    {
        var snap = await _hw.GetSnapshotAsync();
        IsLoading = false;

        CpuPercent = snap.CpuPercent;
        RamPercent = snap.RamPercent;
        DiskPercent = snap.DiskPercent;
        GpuPercent  = snap.GpuPercent ?? 0;

        CpuLabel  = $"{snap.CpuPercent:F0}%";
        RamLabel  = $"{snap.RamPercent:F0}% · {snap.RamUsedGb:F1} / {snap.RamTotalGb:F1} GB";
        DiskLabel = $"{snap.DiskPercent:F0}%";
        GpuLabel  = snap.GpuPercent.HasValue ? $"{snap.GpuPercent.Value:F0}%" : "N/A";

        CpuModel  = snap.CpuModel;
        OsVersion = snap.OsVersion;
        DiskTotal = snap.DiskTotal;
        DiskFree  = snap.DiskFree;
        GpuModel  = snap.GpuModel ?? "N/A";
        CpuTemp   = snap.CpuTempC.HasValue ? $"{snap.CpuTempC.Value:F0}°C" : "N/A";
        ReadMbps  = snap.ReadMbps;
        WriteMbps = snap.WriteMbps;
    }

    public void Dispose()
    {
        _timer.Stop();
        _hw.Dispose();
    }
}
