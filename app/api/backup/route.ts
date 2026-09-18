import {
  databaseSetupMessage,
  isMissingDatabaseSchema,
} from "@/lib/supabase/errors";
import { requireApiUser } from "@/lib/supabase/server";
import { buildBackup } from "@/lib/backup/data";

function jsonError(message: string, status = 500) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const backup = await buildBackup(supabase, user.id);
    const exportedAt = backup.exported_at;

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="buku-piutang-${exportedAt.slice(0, 10)}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error))
      return jsonError(databaseSetupMessage, 503);
    return jsonError("Cadangan belum dapat dibuat.");
  }
}
