using System.Collections.Generic;

namespace JGoodeAIO.Models;

public class Tweak
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public bool IsActive { get; set; }
    public string? Warning { get; set; }
    public string? FeatureBreaks { get; set; }
    public string PowerShellCommand { get; set; } = "";
}

public class AppSettings
{
    public string AccentColor { get; set; } = "#EF4444";
    public bool IsDarkMode { get; set; } = true;
    public int FontSize { get; set; } = 14;
    public Dictionary<int, bool> TweakStates { get; set; } = new();
}
