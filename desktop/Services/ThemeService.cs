using Avalonia;
using Avalonia.Media;
using Avalonia.Styling;
using System;

namespace JGoodeAIO.Services;

public static class ThemeService
{
    public static readonly (string Name, string Hex)[] AccentColors =
    [
        ("Red",    "#EF4444"),
        ("Orange", "#F97316"),
        ("Amber",  "#F59E0B"),
        ("Yellow", "#EAB308"),
        ("Lime",   "#84CC16"),
        ("Green",  "#22C55E"),
        ("Teal",   "#14B8A6"),
        ("Cyan",   "#06B6D4"),
        ("Blue",   "#3B82F6"),
        ("Indigo", "#6366F1"),
        ("Purple", "#A855F7"),
        ("Pink",   "#EC4899"),
        ("Rose",   "#F43F5E"),
    ];

    public static void Apply(string accentHex, bool isDark)
    {
        SetAccent(accentHex);
        SetMode(isDark);
    }

    public static void SetAccent(string hex)
    {
        if (Application.Current?.Resources is null) return;
        var color = Color.Parse(hex);
        var brush = new SolidColorBrush(color);

        Application.Current.Resources["AccentColor"] = color;
        Application.Current.Resources["AccentBrush"] = brush;

        var dimColor = Color.FromArgb(40, color.R, color.G, color.B);
        Application.Current.Resources["AccentDimBrush"] = new SolidColorBrush(dimColor);

        var midColor = Color.FromArgb(100, color.R, color.G, color.B);
        Application.Current.Resources["AccentMidBrush"] = new SolidColorBrush(midColor);
    }

    public static void SetMode(bool isDark)
    {
        if (Application.Current?.Resources is null) return;

        if (isDark)
        {
            Application.Current.Resources["AppBackground"]  = new SolidColorBrush(Color.Parse("#09090b"));
            Application.Current.Resources["SidebarBg"]      = new SolidColorBrush(Color.Parse("#0d0d0f"));
            Application.Current.Resources["CardBg"]         = new SolidColorBrush(Color.Parse("#111113"));
            Application.Current.Resources["CardBorder"]     = new SolidColorBrush(Color.Parse("#27272a"));
            Application.Current.Resources["TextPrimary"]    = new SolidColorBrush(Color.Parse("#fafafa"));
            Application.Current.Resources["TextSecondary"]  = new SolidColorBrush(Color.Parse("#a1a1aa"));
            Application.Current.Resources["TextMuted"]      = new SolidColorBrush(Color.Parse("#52525b"));
            Application.Current.Resources["HoverBg"]        = new SolidColorBrush(Color.Parse("#18181b"));
            Application.Current.Resources["InputBg"]        = new SolidColorBrush(Color.Parse("#18181b"));
        }
        else
        {
            Application.Current.Resources["AppBackground"]  = new SolidColorBrush(Color.Parse("#fafafa"));
            Application.Current.Resources["SidebarBg"]      = new SolidColorBrush(Color.Parse("#f4f4f5"));
            Application.Current.Resources["CardBg"]         = new SolidColorBrush(Color.Parse("#ffffff"));
            Application.Current.Resources["CardBorder"]     = new SolidColorBrush(Color.Parse("#e4e4e7"));
            Application.Current.Resources["TextPrimary"]    = new SolidColorBrush(Color.Parse("#09090b"));
            Application.Current.Resources["TextSecondary"]  = new SolidColorBrush(Color.Parse("#52525b"));
            Application.Current.Resources["TextMuted"]      = new SolidColorBrush(Color.Parse("#a1a1aa"));
            Application.Current.Resources["HoverBg"]        = new SolidColorBrush(Color.Parse("#e4e4e7"));
            Application.Current.Resources["InputBg"]        = new SolidColorBrush(Color.Parse("#f4f4f5"));
        }

        Application.Current.RequestedThemeVariant = isDark ? ThemeVariant.Dark : ThemeVariant.Light;
    }
}
