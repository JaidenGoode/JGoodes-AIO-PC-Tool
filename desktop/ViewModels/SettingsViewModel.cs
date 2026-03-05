using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using JGoodeAIO.Models;
using JGoodeAIO.Services;
using System.Collections.ObjectModel;

namespace JGoodeAIO.ViewModels;

public record AccentColorOption(string Name, string Hex, bool IsSelected);

public partial class SettingsViewModel : ViewModelBase
{
    private readonly AppSettings _settings;

    [ObservableProperty] private bool _isDarkMode;
    [ObservableProperty] private int _fontSize;
    [ObservableProperty] private string _selectedAccent;
    [ObservableProperty] private ObservableCollection<AccentColorItem> _accentColors = new();

    public SettingsViewModel()
    {
        _settings = StorageService.LoadSettings();
        _isDarkMode = _settings.IsDarkMode;
        _fontSize = _settings.FontSize;
        _selectedAccent = _settings.AccentColor;

        foreach (var (name, hex) in ThemeService.AccentColors)
            AccentColors.Add(new AccentColorItem(name, hex, hex == _selectedAccent, this));
    }

    public void SetAccent(string hex)
    {
        SelectedAccent = hex;
        foreach (var c in AccentColors)
            c.IsSelected = c.Hex == hex;

        _settings.AccentColor = hex;
        StorageService.SaveSettings(_settings);
        ThemeService.SetAccent(hex);
    }

    partial void OnIsDarkModeChanged(bool value)
    {
        _settings.IsDarkMode = value;
        StorageService.SaveSettings(_settings);
        ThemeService.SetMode(value);
    }

    partial void OnFontSizeChanged(int value)
    {
        _settings.FontSize = value;
        StorageService.SaveSettings(_settings);
    }

    [RelayCommand]
    private void ResetDefaults()
    {
        var def = new AppSettings();
        _settings.AccentColor = def.AccentColor;
        _settings.IsDarkMode = def.IsDarkMode;
        _settings.FontSize = def.FontSize;
        StorageService.SaveSettings(_settings);

        IsDarkMode = def.IsDarkMode;
        FontSize = def.FontSize;
        SetAccent(def.AccentColor);
    }
}

public partial class AccentColorItem : ObservableObject
{
    private readonly SettingsViewModel _parent;

    public string Name { get; }
    public string Hex { get; }
    public Avalonia.Media.IBrush Brush { get; }
    [ObservableProperty] private bool _isSelected;

    public AccentColorItem(string name, string hex, bool isSelected, SettingsViewModel parent)
    {
        Name = name;
        Hex = hex;
        Brush = new Avalonia.Media.SolidColorBrush(Avalonia.Media.Color.Parse(hex));
        _isSelected = isSelected;
        _parent = parent;
    }

    [RelayCommand]
    private void Select() => _parent.SetAccent(Hex);
}
