using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace JGoodeAIO.ViewModels;

public partial class GithubViewModel : ViewModelBase
{
    [ObservableProperty] private string _token = "";
    [ObservableProperty] private string _username = "";
    [ObservableProperty] private string _repoName = "JGoode-AIO-PC-Tool-Config";
    [ObservableProperty] private string _repoDescription = "JGoode A.I.O PC Tool — My saved PC optimization settings";
    [ObservableProperty] private bool _isPrivate;
    [ObservableProperty] private string _statusMessage = "Enter your GitHub token and push your settings to a repo.";
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private bool _isVerified;

    [RelayCommand]
    private async Task VerifyTokenAsync()
    {
        if (string.IsNullOrWhiteSpace(Token))
        {
            StatusMessage = "Please enter a GitHub personal access token.";
            return;
        }
        IsBusy = true;
        StatusMessage = "Verifying token...";

        try
        {
            using var http = MakeClient();
            var resp = await http.GetAsync("https://api.github.com/user");
            if (resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync();
                dynamic? obj = JsonConvert.DeserializeObject(body);
                string login = obj?.login ?? "";
                Username = login;
                IsVerified = true;
                StatusMessage = $"Verified as @{login}";
            }
            else
            {
                IsVerified = false;
                StatusMessage = "Token invalid. Check permissions (needs 'repo' scope).";
            }
        }
        catch (Exception ex)
        {
            IsVerified = false;
            StatusMessage = $"Error: {ex.Message}";
        }
        IsBusy = false;
    }

    [RelayCommand]
    private async Task PushSettingsAsync()
    {
        if (!IsVerified)
        {
            StatusMessage = "Verify your token first.";
            return;
        }
        IsBusy = true;
        StatusMessage = "Pushing settings to GitHub...";

        try
        {
            using var http = MakeClient();

            // Ensure repo exists
            await EnsureRepoAsync(http);

            // Push settings.json
            var settingsPath = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "JGoodeAIO", "settings.json");
            string content = System.IO.File.Exists(settingsPath)
                ? System.IO.File.ReadAllText(settingsPath)
                : "{}";

            string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(content));

            // Get current SHA if file exists
            string? sha = null;
            var getResp = await http.GetAsync(
                $"https://api.github.com/repos/{Username}/{RepoName}/contents/settings.json");
            if (getResp.IsSuccessStatusCode)
            {
                var existing = JsonConvert.DeserializeObject<dynamic>(
                    await getResp.Content.ReadAsStringAsync());
                sha = existing?.sha;
            }

            var payload = new
            {
                message = $"Update settings — {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC",
                content = encoded,
                sha
            };

            var putResp = await http.PutAsync(
                $"https://api.github.com/repos/{Username}/{RepoName}/contents/settings.json",
                new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

            StatusMessage = putResp.IsSuccessStatusCode
                ? $"Settings pushed to github.com/{Username}/{RepoName}"
                : $"Push failed: {putResp.StatusCode}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        IsBusy = false;
    }

    private async Task EnsureRepoAsync(HttpClient http)
    {
        var resp = await http.GetAsync($"https://api.github.com/repos/{Username}/{RepoName}");
        if (!resp.IsSuccessStatusCode)
        {
            var body = new
            {
                name = RepoName,
                description = RepoDescription,
                @private = IsPrivate,
                auto_init = true
            };
            await http.PostAsync("https://api.github.com/user/repos",
                new StringContent(JsonConvert.SerializeObject(body), Encoding.UTF8, "application/json"));
            await Task.Delay(1500);
        }
    }

    private HttpClient MakeClient()
    {
        var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", Token);
        http.DefaultRequestHeaders.UserAgent.ParseAdd("JGoodeAIO/1.0");
        http.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        return http;
    }
}
