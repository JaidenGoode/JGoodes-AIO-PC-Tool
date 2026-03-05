using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace JGoodeAIO.Services;

public record TweakResult(string Title, bool Success, string Output);

public static class PowerShellService
{
    /// <summary>
    /// Runs a single PowerShell command. Because the app has requireAdministrator in its
    /// manifest, we are already elevated — no UAC prompt per tweak needed.
    /// </summary>
    public static async Task<(bool success, string output)> RunAsync(string command)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return (false, "PowerShell commands only run on Windows.");

        return await Task.Run(() =>
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName               = "powershell.exe",
                    Arguments              = BuildArgs(command),
                    UseShellExecute        = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true,
                    CreateNoWindow         = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding  = Encoding.UTF8,
                };

                using var proc = Process.Start(psi)
                    ?? throw new Exception("Failed to start PowerShell.");

                string stdout = proc.StandardOutput.ReadToEnd();
                string stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit(60_000);

                bool ok = proc.ExitCode == 0;
                string result = ok
                    ? (string.IsNullOrWhiteSpace(stdout) ? "Done." : stdout.Trim())
                    : (string.IsNullOrWhiteSpace(stderr) ? $"Exit {proc.ExitCode}" : stderr.Trim());

                return (ok, result);
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        });
    }

    /// <summary>
    /// Runs multiple tweaks in a single PowerShell session with per-command error handling
    /// and progress reporting via the provided callback.
    /// </summary>
    public static async Task<List<TweakResult>> RunBatchAsync(
        IEnumerable<(string title, string command)> tweaks,
        IProgress<(int done, int total, string current)>? progress = null)
    {
        var list = new List<(string title, string command)>(tweaks);
        var results = new List<TweakResult>();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            foreach (var (title, _) in list)
                results.Add(new TweakResult(title, false, "Windows only."));
            return results;
        }

        // Build a combined script that runs each command and outputs a separator
        var script = new StringBuilder();
        script.AppendLine("$ErrorActionPreference = 'SilentlyContinue'");
        for (int i = 0; i < list.Count; i++)
        {
            var (title, cmd) = list[i];
            string escapedTitle = title.Replace("'", "''");
            string escapedCmd   = cmd.Replace("\"", "\\\"").Replace("\r\n", "; ").Replace("\n", "; ");
            script.AppendLine($"Write-Output '__TWEAK_START__{i}__'");
            script.AppendLine($"try {{ {escapedCmd} }} catch {{ Write-Output \"Error: $_\" }}");
            script.AppendLine($"Write-Output '__TWEAK_END__{i}__'");
        }

        return await Task.Run(async () =>
        {
            string scriptPath = Path.GetTempFileName() + ".ps1";
            File.WriteAllText(scriptPath, script.ToString(), Encoding.UTF8);

            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName               = "powershell.exe",
                    Arguments              = $"-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File \"{scriptPath}\"",
                    UseShellExecute        = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true,
                    CreateNoWindow         = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding  = Encoding.UTF8,
                };

                using var proc = Process.Start(psi)
                    ?? throw new Exception("Failed to start PowerShell.");

                // Stream output per tweak for live progress
                int? currentIdx = null;
                var currentOutput = new StringBuilder();
                int completed = 0;

                string? line;
                while ((line = await proc.StandardOutput.ReadLineAsync()) != null)
                {
                    if (line.StartsWith("__TWEAK_START__"))
                    {
                        currentIdx = int.Parse(line.Replace("__TWEAK_START__", "").Replace("__", ""));
                        currentOutput.Clear();
                        if (currentIdx < list.Count)
                            progress?.Report((completed, list.Count, list[currentIdx.Value].title));
                    }
                    else if (line.StartsWith("__TWEAK_END__"))
                    {
                        if (currentIdx.HasValue && currentIdx < list.Count)
                        {
                            string output = currentOutput.ToString().Trim();
                            bool success  = !output.StartsWith("Error:", StringComparison.OrdinalIgnoreCase);
                            results.Add(new TweakResult(
                                list[currentIdx.Value].title,
                                success,
                                string.IsNullOrEmpty(output) ? "Applied." : output));
                        }
                        completed++;
                        currentIdx = null;
                    }
                    else if (currentIdx.HasValue)
                    {
                        currentOutput.AppendLine(line);
                    }
                }

                proc.WaitForExit(300_000);
            }
            finally
            {
                try { File.Delete(scriptPath); } catch { }
            }

            // Fill any missing results (commands that produced no output markers)
            while (results.Count < list.Count)
                results.Add(new TweakResult(list[results.Count].title, true, "Applied."));

            return results;
        });
    }

    public static void ExportScript(string path, IEnumerable<(string title, string command)> tweaks)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# JGoode A.I.O PC Tool — Exported Tweaks");
        sb.AppendLine("# Run as Administrator in PowerShell");
        sb.AppendLine($"# Generated: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine();
        sb.AppendLine("$ErrorActionPreference = 'SilentlyContinue'");
        sb.AppendLine();
        foreach (var (title, cmd) in tweaks)
        {
            sb.AppendLine($"# ── {title} ──");
            sb.AppendLine(cmd);
            sb.AppendLine();
        }
        File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
    }

    private static string BuildArgs(string command)
    {
        string escaped = command.Replace("\"", "\\\"").Replace("\r\n", "; ").Replace("\n", "; ");
        return $"-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"{escaped}\"";
    }
}
