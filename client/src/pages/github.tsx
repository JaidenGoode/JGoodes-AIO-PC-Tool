import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SiGithub } from "react-icons/si";
import {
  GitBranch, Upload, RefreshCw, CheckCircle2, AlertCircle,
  Loader2, Plus, Lock, Unlock, ExternalLink, Key, ExternalLink as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
}

interface PushResult {
  success: boolean;
  repo: string;
  pushed: number;
  skipped: number;
  errors: string[];
}

const isElectron = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

function TokenSetupScreen() {
  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          GitHub <span className="text-primary">Push</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Push this project to your GitHub repository</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl border border-primary/20 bg-primary/4 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">GitHub Token Required</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a Personal Access Token to enable GitHub push</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Setup Steps</p>

          <div className="space-y-2.5">
            <div className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">1</span>
              <p>
                Go to{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  github.com/settings/tokens/new
                  <LinkIcon className="h-2.5 w-2.5" />
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">2</span>
              <p>Set a name (e.g. <span className="font-mono text-foreground/70 bg-secondary/60 px-1 rounded">JGoode AIO Tool</span>), check the <span className="font-semibold text-foreground/70">repo</span> scope, and click <span className="font-semibold text-foreground/70">Generate token</span></p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">3</span>
              <p>Copy the token, then open <span className="font-semibold text-foreground/70">Replit → Secrets (🔒)</span> in the left sidebar</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">4</span>
              <p>Add a new secret named <span className="font-mono text-foreground/70 bg-secondary/60 px-1 rounded">GITHUB_TOKEN</span> and paste your token as the value</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">5</span>
              <p>Restart the app workflow and come back to this page — GitHub push will be ready</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function GitHub() {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("JGoode-s-AIO-PC-Tool");
  const [newRepoDesc, setNewRepoDesc] = useState("JGoode's A.I.O PC Tool — All-in-one Windows optimization suite with 51 PowerShell tweaks, live hardware monitoring, and full theme customization.");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/github/status"],
    enabled: !isElectron,
  });

  const { data: user, isLoading: userLoading, error: userError } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
    enabled: !isElectron && status?.configured === true,
    retry: false,
  });

  const { data: repos, isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: !!user,
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const body: any = { owner: user.login };
      if (mode === "new") {
        body.createNew = true;
        body.repoName = newRepoName;
        body.description = newRepoDesc;
        body.isPrivate = isPrivate;
      } else {
        if (!selectedRepo) throw new Error("Please select a repository");
        body.repo = selectedRepo;
      }
      const res = await apiRequest("POST", "/api/github/push", body);
      return res.json() as Promise<PushResult>;
    },
    onSuccess: (data) => {
      setPushResult(data);
    },
    onError: (err: any) => {
      setPushResult({
        success: false,
        repo: "",
        pushed: 0,
        skipped: 0,
        errors: [err?.message || "Push failed. Please try again."],
      });
    },
  });

  if (isElectron) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            GitHub <span className="text-primary">Push</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Push this project to your GitHub repository</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
          <div className="p-5 rounded-full bg-secondary/60 border border-border/50">
            <SiGithub className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="space-y-2 max-w-sm">
            <p className="text-sm font-bold text-foreground">Open in Replit to Push</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              GitHub push requires the Replit environment. Open this project in Replit, add your
              <span className="font-mono text-primary/80 mx-1">GITHUB_TOKEN</span> secret, then use this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            GitHub <span className="text-primary">Push</span>
          </h1>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full bg-secondary" />
          <Skeleton className="h-12 w-full bg-secondary" />
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return <TokenSetupScreen />;
  }

  if (userError) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            GitHub <span className="text-primary">Push</span>
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Token Error</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {(userError as any)?.message || "Could not authenticate with GitHub. Make sure your GITHUB_TOKEN secret has the repo scope and hasn't expired."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          GitHub <span className="text-primary">Push</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Push this project to your GitHub repository
        </p>
      </div>

      {/* Account card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-border bg-card"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SiGithub className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Connected Account
            </p>
            {userLoading ? (
              <Skeleton className="h-5 w-40 bg-secondary" />
            ) : (
              <div className="flex items-center gap-2.5">
                {user?.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full border border-border/60"
                  />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {user?.name || user?.login}
                </span>
                <span className="text-xs text-muted-foreground/50">@{user?.login}</span>
                <div className="flex items-center gap-1 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-400/70 font-medium">Connected</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        <button
          onClick={() => { setMode("existing"); setPushResult(null); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
            mode === "existing"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-mode-existing"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Push to Existing Repo
        </button>
        <button
          onClick={() => { setMode("new"); setPushResult(null); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
            mode === "new"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-mode-new"
        >
          <Plus className="h-3.5 w-3.5" />
          Create New Repo
        </button>
      </motion.div>

      {/* Config panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl border border-border bg-card space-y-4"
      >
        {mode === "existing" ? (
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Select Repository
            </label>
            {reposLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full bg-secondary" />)}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {repos?.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.name)}
                    data-testid={`button-repo-${repo.name}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150",
                      selectedRepo === repo.name
                        ? "bg-primary/8 border-primary/25 text-primary"
                        : "bg-secondary/20 border-border/40 text-foreground/80 hover:border-border/80 hover:bg-secondary/40"
                    )}
                  >
                    <SiGithub className={cn("h-3.5 w-3.5 shrink-0", selectedRepo === repo.name ? "text-primary" : "text-muted-foreground/40")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{repo.name}</p>
                      {repo.description && (
                        <p className="text-[10px] text-muted-foreground/50 truncate">{repo.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-muted-foreground/30" />
                      ) : (
                        <Unlock className="h-3 w-3 text-muted-foreground/30" />
                      )}
                      {selectedRepo === repo.name && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
                {repos?.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">No repositories found</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Repository Name
              </label>
              <Input
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="JGoode-s-AIO-PC-Tool"
                className="bg-secondary border-border/60 focus:border-primary/40 h-9 text-sm"
                data-testid="input-new-repo-name"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Description
              </label>
              <Input
                value={newRepoDesc}
                onChange={(e) => setNewRepoDesc(e.target.value)}
                placeholder="Repository description"
                className="bg-secondary border-border/60 focus:border-primary/40 h-9 text-sm"
                data-testid="input-new-repo-desc"
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[12px] font-semibold text-foreground/80">Private Repository</p>
                <p className="text-[10px] text-muted-foreground/50">Only you can see it</p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                className="data-[state=checked]:bg-primary"
                data-testid="switch-private-repo"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Push result */}
      {pushResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border",
            pushResult.success
              ? "bg-green-500/6 border-green-500/20"
              : "bg-destructive/6 border-destructive/20"
          )}
        >
          <div className="flex items-start gap-3">
            {pushResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                {pushResult.success ? "Push Complete!" : "Push Failed"}
              </p>
              {pushResult.success && (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pushResult.pushed} files pushed · {pushResult.skipped} skipped
                  </p>
                  <a
                    href={pushResult.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline font-semibold"
                    data-testid="link-pushed-repo"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {pushResult.repo}
                  </a>
                </>
              )}
              {pushResult.errors?.length > 0 && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Errors: {pushResult.errors.join(", ")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Push button */}
      <Button
        onClick={() => { setPushResult(null); pushMutation.mutate(); }}
        disabled={pushMutation.isPending || userLoading || (mode === "existing" && !selectedRepo)}
        className="w-full h-11 text-sm font-bold gap-2 bg-primary hover:bg-primary/90 text-white"
        data-testid="button-push-github"
      >
        {pushMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Pushing to GitHub...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {mode === "new" ? "Create Repo & Push" : "Push to GitHub"}
          </>
        )}
      </Button>

      {/* Info box */}
      <div className="p-3 rounded-lg border border-border/40 bg-secondary/20 text-xs text-muted-foreground/60 leading-relaxed">
        <p className="font-semibold text-foreground/60 mb-1 flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" />
          How it works
        </p>
        Pushes all source files (client, server, shared, root configs) in a single batch commit.
        Files over 512 KB are skipped automatically. Secrets and node_modules are never included.
        Uses your <span className="font-mono">GITHUB_TOKEN</span> secret for authentication.
      </div>
    </div>
  );
}
