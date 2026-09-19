import { buildBackup } from "@/lib/backup/data";
import {
  githubBackupError,
  isGitHubBackupConfigured,
  listGitHubBackups,
  readGitHubBackup,
  uploadGitHubBackup,
} from "@/lib/backup/github";
import {
  databaseSetupMessage,
  isMissingDatabaseSchema,
} from "@/lib/supabase/errors";
import { requireApiUser } from "@/lib/supabase/server";

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return Response.json(
      { ok: false, message: "Silakan masuk terlebih dahulu." },
      { status: 401 },
    );
  if (isMissingDatabaseSchema(error))
    return Response.json(
      { ok: false, message: databaseSetupMessage },
      { status: 503 },
    );
  console.error(error);
  const result = githubBackupError(error);
  return Response.json(
    { ok: false, message: result.message },
    { status: result.status },
  );
}

export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!isGitHubBackupConfigured())
      return Response.json({ ok: true, configured: false, backups: [] });
    const backups = (await listGitHubBackups(user.id)).slice(0, 3);
    return Response.json({ ok: true, configured: true, backups });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const body = (await request.json()) as { action?: unknown; path?: unknown };
    if (!isGitHubBackupConfigured())
      return Response.json(
        {
          ok: false,
          message: "Cadangan GitHub belum dikonfigurasi di server.",
        },
        { status: 503 },
      );
    if (body.action === "upload") {
      const backup = await buildBackup(supabase, user.id);
      const saved = await uploadGitHubBackup(user.id, backup);
      return Response.json({ ok: true, backup: saved });
    }
    if (body.action === "read" && typeof body.path === "string") {
      const backup = await readGitHubBackup(user.id, body.path);
      return Response.json({ ok: true, backup });
    }
    return Response.json(
      { ok: false, message: "Tindakan cadangan tidak dikenali." },
      { status: 400 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
