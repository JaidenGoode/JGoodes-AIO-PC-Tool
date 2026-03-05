using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using JGoodeAIO.Services;
using JGoodeAIO.ViewModels;

namespace JGoodeAIO;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var settings = StorageService.LoadSettings();
            ThemeService.Apply(settings.AccentColor, settings.IsDarkMode);

            desktop.MainWindow = new MainWindow
            {
                DataContext = new MainViewModel(),
            };
        }
        base.OnFrameworkInitializationCompleted();
    }
}
