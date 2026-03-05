using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using JGoodeAIO.Data;
using JGoodeAIO.Models;
using JGoodeAIO.Services;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace JGoodeAIO.ViewModels;

public partial class TweakItemViewModel : ViewModelBase
{
    public Tweak Tweak { get; }

    [ObservableProperty] private bool _isActive;
    [ObservableProperty] private bool _isRunning;
    [ObservableProperty] private string? _statusMessage;
    [ObservableProperty] private bool _lastRunSuccess = true;

    public TweakItemViewModel(Tweak tweak)
    {
        Tweak    = tweak;
        _isActive = tweak.IsActive;
    }
}

public partial class TweaksViewModel : ViewModelBase
{
    private readonly AppSettings _settings;
    private readonly ObservableCollection<TweakItemViewModel> _allTweaks;

    [ObservableProperty] private ObservableCollection<TweakItemViewModel> _filteredTweaks = new();
    [ObservableProperty] private string _searchQuery = "";
    [ObservableProperty] private string _selectedCategory = "All";
    [ObservableProperty] private string _statusMessage = "";
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private int _progressDone;
    [ObservableProperty] private int _progressTotal;
    [ObservableProperty] private string _progressLabel = "";

    public string[] Categories { get; } =
        ["All", "debloat", "privacy", "performance", "gaming", "system", "browser"];

    public int EnabledCount => _allTweaks.Count(t => t.IsActive);

    public TweaksViewModel()
    {
        _settings = StorageService.LoadSettings();
        _allTweaks = new ObservableCollection<TweakItemViewModel>(
            TweakDefinitions.All.Select(t =>
            {
                _settings.TweakStates.TryGetValue(t.Id, out bool state);
                t.IsActive = state;
                var vm = new TweakItemViewModel(t);
                vm.PropertyChanged += (_, e) =>
                {
                    if (e.PropertyName == nameof(TweakItemViewModel.IsActive))
                        SaveTweakState(vm);
                };
                return vm;
            })
        );
        ApplyFilter();
    }

    partial void OnSearchQueryChanged(string value) => ApplyFilter();
    partial void OnSelectedCategoryChanged(string value) => ApplyFilter();

    private void ApplyFilter()
    {
        var query    = SearchQuery.Trim().ToLowerInvariant();
        var category = SelectedCategory;
        var filtered = _allTweaks
            .Where(t =>
                (category == "All" || t.Tweak.Category == category) &&
                (string.IsNullOrEmpty(query) ||
                 t.Tweak.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                 t.Tweak.Description.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        FilteredTweaks = new ObservableCollection<TweakItemViewModel>(filtered);
    }

    private void SaveTweakState(TweakItemViewModel vm)
    {
        _settings.TweakStates[vm.Tweak.Id] = vm.IsActive;
        StorageService.SaveSettings(_settings);
        OnPropertyChanged(nameof(EnabledCount));
    }

    [RelayCommand]
    private void SelectAll()
    {
        foreach (var vm in _allTweaks)
            vm.IsActive = true;
        SaveAllStates();
    }

    [RelayCommand]
    private void SelectNone()
    {
        foreach (var vm in _allTweaks)
            vm.IsActive = false;
        SaveAllStates();
    }

    [RelayCommand]
    private void SelectRecommended()
    {
        foreach (var vm in _allTweaks)
            vm.IsActive = string.IsNullOrEmpty(vm.Tweak.Warning);
        SaveAllStates();
    }

    private void SaveAllStates()
    {
        foreach (var vm in _allTweaks)
            _settings.TweakStates[vm.Tweak.Id] = vm.IsActive;
        StorageService.SaveSettings(_settings);
        OnPropertyChanged(nameof(EnabledCount));
    }

    /// <summary>
    /// Runs all enabled tweaks in ONE hidden PowerShell session.
    /// Live progress reported per tweak with full result capture.
    /// </summary>
    [RelayCommand]
    private async Task ApplyAsync()
    {
        var enabled = _allTweaks.Where(t => t.IsActive).ToList();
        if (enabled.Count == 0)
        {
            StatusMessage = "No tweaks selected — toggle some tweaks on first.";
            await Task.Delay(3000);
            StatusMessage = "";
            return;
        }

        IsBusy = true;
        ProgressDone  = 0;
        ProgressTotal = enabled.Count;
        StatusMessage = $"Applying {enabled.Count} tweaks…";

        foreach (var vm in enabled)
        {
            vm.IsRunning     = true;
            vm.StatusMessage = "Queued…";
        }

        var pairs = enabled.Select(v => (v.Tweak.Title, v.Tweak.PowerShellCommand));

        var progress = new Progress<(int done, int total, string current)>(p =>
        {
            ProgressDone  = p.done;
            ProgressTotal = p.total;
            ProgressLabel = $"Applying: {p.current}  ({p.done} / {p.total})";
            StatusMessage = ProgressLabel;

            // Mark completed ones as done
            for (int i = 0; i < p.done && i < enabled.Count; i++)
            {
                if (enabled[i].IsRunning && string.IsNullOrEmpty(enabled[i].StatusMessage) is false
                    && enabled[i].StatusMessage == "Queued…")
                {
                    // will be updated by result pass below
                }
            }
        });

        var results = await PowerShellService.RunBatchAsync(pairs, progress);

        var lookup = enabled.ToDictionary(v => v.Tweak.Title, v => v);
        foreach (var result in results)
        {
            if (!lookup.TryGetValue(result.Title, out var vm)) continue;
            vm.IsRunning      = false;
            vm.LastRunSuccess = result.Success;
            vm.StatusMessage  = result.Success
                ? "✓ Applied"
                : $"✗ {result.Output.Split('\n')[0].Trim()}";
        }

        int ok   = results.Count(r => r.Success);
        int fail = results.Count(r => !r.Success);
        ProgressDone  = ProgressTotal;
        ProgressLabel = $"Done — {ok} applied{(fail > 0 ? $", {fail} failed" : "")}";
        StatusMessage = fail == 0
            ? $"All {ok} tweaks applied successfully."
            : $"{ok} applied · {fail} failed — see results below.";

        IsBusy = false;

        await Task.Delay(7000);
        foreach (var vm in enabled)
            vm.StatusMessage = null;
        StatusMessage = "";
    }
}
