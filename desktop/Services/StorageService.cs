using JGoodeAIO.Models;
using Newtonsoft.Json;
using System;
using System.IO;

namespace JGoodeAIO.Services;

public static class StorageService
{
    private static readonly string DataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "JGoodeAIO");

    private static readonly string SettingsFile = Path.Combine(DataDir, "settings.json");

    static StorageService()
    {
        Directory.CreateDirectory(DataDir);
    }

    public static AppSettings LoadSettings()
    {
        try
        {
            if (File.Exists(SettingsFile))
            {
                var json = File.ReadAllText(SettingsFile);
                return JsonConvert.DeserializeObject<AppSettings>(json) ?? new AppSettings();
            }
        }
        catch { }
        return new AppSettings();
    }

    public static void SaveSettings(AppSettings settings)
    {
        try
        {
            File.WriteAllText(SettingsFile, JsonConvert.SerializeObject(settings, Formatting.Indented));
        }
        catch { }
    }
}
