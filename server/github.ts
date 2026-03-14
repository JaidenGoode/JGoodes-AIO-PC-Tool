const GH_API = "https://api.github.com";

function getToken(): string {
  const token =
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN_MARCH5 ||
    process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token found. Add a secret named GITHUB_TOKEN with your Personal Access Token (classic, repo scope).");
  return token;
}

async function ghFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const url = endpoint.startsWith("http") ? endpoint : `${GH_API}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

async function ghJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await ghFetch(endpoint, options);
  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(data?.message || `GitHub API error ${res.status} on ${endpoint}`);
  }
  return data as T;
}

async function ghPost<T>(endpoint: string, body: unknown): Promise<T> {
  return ghJson<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export function isTokenConfigured(): boolean {
  return !!(process.env.GITHUB_PERSONAL_ACCESS_TOKEN_MARCH5 || process.env.GITHUB_TOKEN);
}

export async function getGitHubUser(): Promise<GitHubUser> {
  return ghJson("/user");
}

export async function listUserRepos(): Promise<GitHubRepo[]> {
  return ghJson("/user/repos?per_page=100&sort=updated");
}

export async function createRepo(name: string, description: string, isPrivate: boolean): Promise<GitHubRepo> {
  return ghPost("/user/repos", { name, description, private: isPrivate, auto_init: false });
}

async function getRef(owner: string, repo: string, branch: string): Promise<{ object: { sha: string } } | null> {
  const res = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  if (!res.ok) return null;
  const data = await res.json() as any;
  if (!data || data.message || !data.object?.sha) return null;
  return data;
}

async function getCommitTree(owner: string, repo: string, commitSha: string): Promise<string> {
  const commit = await ghJson<any>(`/repos/${owner}/${repo}/git/commits/${commitSha}`);
  return commit.tree.sha;
}

async function createBlob(owner: string, repo: string, base64Content: string): Promise<string> {
  const result = await ghPost<any>(`/repos/${owner}/${repo}/git/blobs`, {
    content: base64Content,
    encoding: "base64",
  });
  if (!result?.sha) throw new Error("Blob creation returned no SHA");
  return result.sha;
}

async function getFullTreeWithShas(
  owner: string,
  repo: string,
  treeSha: string
): Promise<{ path: string; sha: string }[]> {
  const result = await ghJson<any>(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
  if (!result?.tree) return [];
  return (result.tree as any[])
    .filter((item: any) => item.type === "blob")
    .map((item: any) => ({ path: item.path as string, sha: item.sha as string }));
}

async function createTree(
  owner: string,
  repo: string,
  items: { path: string; sha: string }[]
): Promise<string> {
  const body: any = {
    tree: items.map((item) => ({
      path: item.path,
      mode: "100644",
      type: "blob",
      sha: item.sha,
    })),
  };
  const result = await ghPost<any>(`/repos/${owner}/${repo}/git/trees`, body);
  if (!result?.sha) throw new Error("Tree creation returned no SHA");
  return result.sha;
}

async function createCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentShas: string[]
): Promise<string> {
  const body: any = { message, tree: treeSha };
  if (parentShas.length > 0) body.parents = parentShas;
  const result = await ghPost<any>(`/repos/${owner}/${repo}/git/commits`, body);
  if (!result?.sha) throw new Error("Commit creation returned no SHA");
  return result.sha;
}

async function upsertRef(owner: string, repo: string, branch: string, sha: string, exists: boolean): Promise<void> {
  if (exists) {
    const res = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha, force: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any;
      throw new Error(err?.message || `Failed to update ref: HTTP ${res.status}`);
    }
  } else {
    await ghPost(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha,
    });
  }
}

async function runInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 4
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function pushFilesViaTree(
  owner: string,
  repo: string,
  files: { path: string; content: Buffer }[],
  commitMessage: string,
  managedDirs: string[] = [],
  managedRootFiles: string[] = []
): Promise<{ pushed: number; skipped: number; repoUrl: string; errors: string[] }> {
  const branch = "main";

  const headRef = await getRef(owner, repo, branch);
  const headSha = headRef?.object?.sha ?? null;
  const baseTreeSha = headSha ? await getCommitTree(owner, repo, headSha) : null;

  // Step 1: Get ALL files currently on GitHub with their blob SHAs
  const remoteEntries = baseTreeSha ? await getFullTreeWithShas(owner, repo, baseTreeSha) : [];

  // Step 2: Build a mutable map starting from the complete remote state
  // key = file path, value = blob SHA
  const finalMap = new Map<string, string>(remoteEntries.map((e) => [e.path, e.sha]));

  // Step 3: Upload local files and override/add in the map
  const blobResults = await runInBatches(files, async (file) => {
    const sha = await createBlob(owner, repo, file.content.toString("base64"));
    return { path: file.path, sha };
  }, 4);

  const errors: string[] = [];
  const skippedFiles: string[] = [];
  let pushedCount = 0;
  const localPaths = new Set<string>();

  blobResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      finalMap.set(result.value.path, result.value.sha);
      localPaths.add(result.value.path);
      pushedCount++;
    } else {
      skippedFiles.push(files[i].path);
      errors.push(`${files[i].path}: ${result.reason?.message || "failed"}`);
    }
  });

  if (pushedCount === 0) {
    throw new Error(`All ${files.length} files failed to upload. First error: ${errors[0] || "unknown"}`);
  }

  // Step 4: Remove entries from the map that belong to our managed scope
  // but no longer exist locally — these were deleted and must be removed from GitHub
  for (const { path } of remoteEntries) {
    const isManaged =
      managedRootFiles.includes(path) ||
      managedDirs.some((dir) => path === dir || path.startsWith(dir + "/"));
    if (isManaged && !localPaths.has(path)) {
      finalMap.delete(path);
    }
  }

  // Step 5: Create a completely fresh tree (no base_tree) with exactly the files we want.
  // This is the only reliable way to delete files via the GitHub Trees API.
  const allItems = Array.from(finalMap.entries()).map(([path, sha]) => ({ path, sha }));
  const treeSha = await createTree(owner, repo, allItems);
  const commitSha = await createCommit(owner, repo, commitMessage, treeSha, headSha ? [headSha] : []);
  await upsertRef(owner, repo, branch, commitSha, headRef !== null);

  return {
    pushed: pushedCount,
    skipped: skippedFiles.length,
    repoUrl: `https://github.com/${owner}/${repo}`,
    errors: errors.slice(0, 5),
  };
}
