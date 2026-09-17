import { requireApiUser } from "@/lib/supabase/server";
import { databaseSetupMessage, isMissingDatabaseSchema } from "@/lib/supabase/errors";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase.from("store_settings").select("name,address,updated_at").eq("owner_id", user.id).maybeSingle();
    if (error) throw error;
    return Response.json({ ok: true, store: data ?? { name: "Toko Anda", address: "", updated_at: null } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error)) return jsonError(databaseSetupMessage, 503);
    return jsonError("Informasi toko belum dapat dibuka.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const address = String(body.address ?? "").trim();
    if (!name) return jsonError("Nama toko wajib diisi.");
    if (name.length > 100) return jsonError("Nama toko terlalu panjang.");
    if (address.length > 500) return jsonError("Alamat toko terlalu panjang.");

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("store_settings").upsert({ owner_id: user.id, name, address, updated_at: updatedAt }, { onConflict: "owner_id" });
    if (error) throw error;
    return Response.json({ ok: true, store: { name, address, updated_at: updatedAt } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error)) return jsonError(databaseSetupMessage, 503);
    return jsonError("Informasi toko belum dapat disimpan.", 500);
  }
}
