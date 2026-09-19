const MAX_BACKUP_BYTES = 5_000_000;
const MAX_GITHUB_BACKUPS = 3;
const DEFAULT_REPOSITORY = "tirsasaki/bukuhutang-backup";

type GitHubContent = {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
};

export type GitHubBackup = {
  name: string;
  path: string;
  sha: string;
  size: number;
  createdAt: string | null;
  legacy: boolean;
};

class GitHubBackupError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function configuration() {
  const token = process.env.GITHUB_BACKUP_TOKEN?.trim();
  const repository = (
    process.env.GITHUB_BACKUP_REPOSITORY || DEFAULT_REPOSITORY
  ).trim();
  const branch = (process.env.GITHUB_BACKUP_BRANCH || "main").trim();
  const match = repository.match(
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  );
  if (!token || !match) return null;
  return { token, repository, branch };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(path: string, init?: RequestInit) {
  const config = configuration();
  if (!config)
    throw new GitHubBackupError(
      "Cadangan GitHub belum dikonfigurasi di server.",
      503,
    );

  const response = await fetch(
    `https://api.github.com/repos/${config.repository}/${path}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": "buku-piutang-backup",
        "X-GitHub-Api-Version": "2022-11-28",
        ...init?.headers,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message =
      response.status === 401 || response.status === 403
        ? "Akses ke repositori cadangan ditolak. Periksa token GitHub."
        : response.status === 404
          ? "Repositori atau berkas cadangan tidak ditemukan."
          : `GitHub belum dapat dihubungi${detail?.message ? `: ${detail.message}` : "."}`;
    throw new GitHubBackupError(message, response.status);
  }
  return response;
}

async function listDirectory(path: string) {
  try {
    const config = configuration();
    const response = await githubRequest(
      `contents/${encodePath(path)}?ref=${encodeURIComponent(config!.branch)}`,
    );
    const result = (await response.json()) as GitHubContent[] | GitHubContent;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    if (error instanceof GitHubBackupError && error.status === 404) return [];
    throw error;
  }
}

function createdAtFromName(name: string) {
  const match = name.match(
    /^buku-piutang-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})[.-](\d{3})Z\.json$/,
  );
  if (!match) return null;
  return `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
}

function isAllowedPath(path: string, userId: string) {
  if (path === `backups/${userId}.json`) return true;
  const prefix = `backups/${userId}/`;
  if (!path.startsWith(prefix)) return false;
  const filename = path.slice(prefix.length);
  return (
    /^[A-Za-z0-9_.-]+\.json$/.test(filename) && !filename.includes("..")
  );
}

export function isGitHubBackupConfigured() {
  return Boolean(configuration());
}

export async function listGitHubBackups(
  userId: string,
): Promise<GitHubBackup[]> {
  const [root, account] = await Promise.all([
    listDirectory("backups"),
    listDirectory(`backups/${userId}`),
  ]);
  const legacy = root.filter(
    (item) => item.type === "file" && item.path === `backups/${userId}.json`,
  );
  return [...account.filter((item) => item.type === "file"), ...legacy]
    .filter(
      (item) =>
        item.name.endsWith(".json") && item.size <= MAX_BACKUP_BYTES,
    )
    .map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      size: item.size,
      createdAt: createdAtFromName(item.name),
      legacy: item.path === `backups/${userId}.json`,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

async function deleteGitHubBackup(backup: GitHubBackup) {
  const config = configuration();
  if (!config)
    throw new GitHubBackupError(
      "Cadangan GitHub belum dikonfigurasi di server.",
      503,
    );
  await githubRequest(`contents/${encodePath(backup.path)}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `Hapus cadangan lama Buku Piutang ${backup.name}`,
      sha: backup.sha,
      branch: config.branch,
    }),
  });
}

async function makeRoomForLatestBackup(userId: string) {
  const backups = await listGitHubBackups(userId);
  const expiredBackups = backups.slice(MAX_GITHUB_BACKUPS - 1);
  for (const backup of expiredBackups) {
    await deleteGitHubBackup(backup);
  }
}

export async function uploadGitHubBackup(
  userId: string,
  backup: unknown,
) {
  const config = configuration();
  if (!config)
    throw new GitHubBackupError(
      "Cadangan GitHub belum dikonfigurasi di server.",
      503,
    );
  const exportedAt =
    typeof backup === "object" &&
    backup !== null &&
    "exported_at" in backup &&
    typeof backup.exported_at === "string"
      ? backup.exported_at
      : new Date().toISOString();
  const filename = `buku-piutang-${exportedAt.replaceAll(":", "-")}.json`;
  const path = `backups/${userId}/${filename}`;
  const raw = JSON.stringify(backup, null, 2);
  await makeRoomForLatestBackup(userId);
  const response = await githubRequest(`contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Simpan cadangan Buku Piutang ${exportedAt}`,
      content: Buffer.from(raw).toString("base64"),
      branch: config.branch,
    }),
  });
  const result = (await response.json()) as { content?: GitHubContent };
  return {
    name: filename,
    path,
    sha: result.content?.sha ?? "",
    size: Buffer.byteLength(raw),
    createdAt: exportedAt,
    legacy: false,
  } satisfies GitHubBackup;
}

export async function readGitHubBackup(userId: string, path: string) {
  if (!isAllowedPath(path, userId))
    throw new GitHubBackupError("Berkas cadangan tidak diizinkan.", 403);
  const config = configuration();
  if (!config)
    throw new GitHubBackupError(
      "Cadangan GitHub belum dikonfigurasi di server.",
      503,
    );
  const response = await githubRequest(
    `contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`,
    { headers: { Accept: "application/vnd.github.raw+json" } },
  );
  const raw = await response.text();
  if (Buffer.byteLength(raw) > MAX_BACKUP_BYTES)
    throw new GitHubBackupError("Berkas cadangan terlalu besar.", 413);
  try {
    const backup = JSON.parse(raw) as { tables?: unknown };
    if (!backup.tables || typeof backup.tables !== "object")
      throw new Error("INVALID_BACKUP");
    return backup;
  } catch {
    throw new GitHubBackupError("Format cadangan tidak dikenali.", 400);
  }
}

export function githubBackupError(error: unknown) {
  if (error instanceof GitHubBackupError)
    return { message: error.message, status: error.status };
  return { message: "Cadangan GitHub belum dapat diproses.", status: 500 };
}
