import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiGithub } from "react-icons/si";
import {
  GitBranch, Upload, RefreshCw, CheckCircle2, AlertCircle,
  Loader2, Plus, Lock, Unlock, ExternalLink,
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

export default function GitHub() {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("JGoodeA.I.O_PC_Tool");
  const [newRepoDesc, setNewRepoDesc] = useState("JGoode A.I.O PC Tool — All-in-one Windows optimization suite with 47 PowerShell tweaks, live hardware monitoring, and full theme customization.");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  const { data: user, isLoading: userLoading, error: userError } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
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

  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">GitHub Not Connected</p>
          <p className="text-xs text-muted-foreground mt-1">
            GitHub authentication failed. Please reconnect via the Replit integration panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
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
                <img
                  src={user?.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full border border-border/60"
                />
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
                placeholder="JGoodeA.I.O_PC_Tool"
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
        Your GitHub OAuth credentials are securely managed by Replit — no API keys needed.
      </div>
    </div>
  );
}
