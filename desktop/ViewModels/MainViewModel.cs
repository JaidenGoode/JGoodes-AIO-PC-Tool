using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.Generic;

namespace JGoodeAIO.ViewModels;

public partial class MainViewModel : ViewModelBase
{
    [ObservableProperty] private ViewModelBase _currentPage;
    [ObservableProperty] private string _selectedNav = "Dashboard";

    private readonly Dictionary<string, ViewModelBase> _pages = new();

    public MainViewModel()
    {
        _pages["Dashboard"] = new DashboardViewModel();
        _pages["Tweaks"]    = new TweaksViewModel();
        _pages["Cleaner"]   = new CleanerViewModel();
        _pages["Settings"]  = new SettingsViewModel();
        _pages["GitHub"]    = new GithubViewModel();
        _currentPage = _pages["Dashboard"];
    }

    [RelayCommand]
    private void Navigate(string page)
    {
        SelectedNav = page;
        if (!_pages.ContainsKey(page))
            _pages[page] = page switch
            {
                "Dashboard" => new DashboardViewModel(),
                "Tweaks"    => new TweaksViewModel(),
                "Cleaner"   => new CleanerViewModel(),
                "Settings"  => new SettingsViewModel(),
                "GitHub"    => new GithubViewModel(),
                _           => new DashboardViewModel(),
            };
        CurrentPage = _pages[page];
    }
}
