import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

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

async function ghProxy(endpoint: string, options: RequestInit = {}) {
  return connectors.proxy("github", endpoint, options);
}

async function ghJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await ghProxy(endpoint, options);
  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(data?.message || `GitHub API error ${res.status} on ${endpoint}`);
  }
  return data as T;
}

async function ghPost<T>(endpoint: string, body: unknown): Promise<T> {
  return ghJson<T>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  const res = await ghProxy(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
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

async function createTree(
  owner: string,
  repo: string,
  baseTree: string | null,
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
  if (baseTree) body.base_tree = baseTree;
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
    const res = await ghProxy(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
  commitMessage: string
): Promise<{ pushed: number; skipped: number; repoUrl: string; errors: string[] }> {
  const branch = "main";

  const headRef = await getRef(owner, repo, branch);
  const headSha = headRef?.object?.sha ?? null;
  const baseTreeSha = headSha ? await getCommitTree(owner, repo, headSha) : null;

  const blobResults = await runInBatches(files, async (file) => {
    const sha = await createBlob(owner, repo, file.content.toString("base64"));
    return { path: file.path, sha };
  }, 4);

  const goodBlobs: { path: string; sha: string }[] = [];
  const errors: string[] = [];
  const skippedFiles: string[] = [];

  blobResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      goodBlobs.push(result.value);
    } else {
      skippedFiles.push(files[i].path);
      errors.push(`${files[i].path}: ${result.reason?.message || "failed"}`);
    }
  });

  if (goodBlobs.length === 0) {
    throw new Error(`All ${files.length} files failed to upload. First error: ${errors[0] || "unknown"}`);
  }

  const treeSha = await createTree(owner, repo, baseTreeSha, goodBlobs);
  const commitSha = await createCommit(owner, repo, commitMessage, treeSha, headSha ? [headSha] : []);
  await upsertRef(owner, repo, branch, commitSha, headRef !== null);

  return {
    pushed: goodBlobs.length,
    skipped: skippedFiles.length,
    repoUrl: `https://github.com/${owner}/${repo}`,
    errors: errors.slice(0, 5),
  };
}
