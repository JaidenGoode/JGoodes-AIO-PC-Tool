using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace JGoodeAIO.Services;

public record HardwareSnapshot(
    double CpuPercent,
    double RamPercent,
    double RamUsedGb,
    double RamTotalGb,
    double DiskPercent,
    string CpuModel,
    string OsVersion,
    string DiskTotal,
    string DiskFree,
    double? GpuPercent,
    string? GpuModel,
    double? CpuTempC,
    double ReadMbps,
    double WriteMbps
);

public class HardwareService : IDisposable
{
    private PerformanceCounter? _cpuCounter;
    private PerformanceCounter? _diskReadCounter;
    private PerformanceCounter? _diskWriteCounter;
    private bool _initialized;

    [DllImport("kernel32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    private void TryInit()
    {
        if (_initialized || !RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;
        try
        {
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _cpuCounter.NextValue();
            _diskReadCounter = new PerformanceCounter("PhysicalDisk", "Disk Read Bytes/sec", "_Total");
            _diskWriteCounter = new PerformanceCounter("PhysicalDisk", "Disk Write Bytes/sec", "_Total");
            _initialized = true;
        }
        catch { }
    }

    public async Task<HardwareSnapshot> GetSnapshotAsync()
    {
        TryInit();
        return await Task.Run(() =>
        {
            double cpu = GetCpu();
            var (ramPct, ramUsed, ramTotal) = GetRam();
            var (diskPct, diskTotal, diskFree) = GetDisk();
            double readMb = 0, writeMb = 0;
            try
            {
                readMb = (_diskReadCounter?.NextValue() ?? 0) / 1_048_576.0;
                writeMb = (_diskWriteCounter?.NextValue() ?? 0) / 1_048_576.0;
            }
            catch { }

            return new HardwareSnapshot(
                CpuPercent: cpu,
                RamPercent: ramPct,
                RamUsedGb: ramUsed,
                RamTotalGb: ramTotal,
                DiskPercent: diskPct,
                CpuModel: GetCpuModel(),
                OsVersion: RuntimeInformation.OSDescription,
                DiskTotal: diskTotal,
                DiskFree: diskFree,
                GpuPercent: null,
                GpuModel: GetGpuModel(),
                CpuTempC: null,
                ReadMbps: Math.Round(readMb, 1),
                WriteMbps: Math.Round(writeMb, 1)
            );
        });
    }

    private double GetCpu()
    {
        try
        {
            if (_cpuCounter != null)
                return Math.Round(_cpuCounter.NextValue(), 1);
        }
        catch { }
        return 0;
    }

    private static (double pct, double usedGb, double totalGb) GetRam()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            var mem = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref mem))
            {
                double total = mem.ullTotalPhys / 1_073_741_824.0;
                double avail = mem.ullAvailPhys / 1_073_741_824.0;
                double used = total - avail;
                return (Math.Round((double)mem.dwMemoryLoad, 1), Math.Round(used, 1), Math.Round(total, 1));
            }
        }
        var proc = Process.GetCurrentProcess();
        double usedMb = proc.WorkingSet64 / 1_073_741_824.0;
        return (0, Math.Round(usedMb, 1), 0);
    }

    private static (double pct, string total, string free) GetDisk()
    {
        try
        {
            var drive = DriveInfo.GetDrives()
                .Where(d => d.DriveType == DriveType.Fixed && d.IsReady)
                .OrderByDescending(d => d.TotalSize)
                .First();
            double pct = (1.0 - (double)drive.AvailableFreeSpace / drive.TotalSize) * 100;
            string total = $"{drive.TotalSize / 1_073_741_824.0:F1} GB";
            string free = $"{drive.AvailableFreeSpace / 1_073_741_824.0:F1} GB";
            return (Math.Round(pct, 1), total, free);
        }
        catch { return (0, "N/A", "N/A"); }
    }

    private static string GetCpuModel()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return RuntimeInformation.ProcessArchitecture.ToString();
        try
        {
            using var reg = Microsoft.Win32.Registry.LocalMachine
                .OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0");
            return reg?.GetValue("ProcessorNameString") as string ?? "Unknown CPU";
        }
        catch { return "Unknown CPU"; }
    }

    private static string? GetGpuModel()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return null;
        try
        {
            using var reg = Microsoft.Win32.Registry.LocalMachine
                .OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000");
            return reg?.GetValue("DriverDesc") as string;
        }
        catch { return null; }
    }

    public void Dispose()
    {
        _cpuCounter?.Dispose();
        _diskReadCounter?.Dispose();
        _diskWriteCounter?.Dispose();
    }
}
