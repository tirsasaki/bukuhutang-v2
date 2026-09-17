import { requireApiUser } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase
      .from("cashiers")
      .select("id,name,phone,is_active,created_at,updated_at")
      .eq("owner_id", user.id)
      .order("is_active", { ascending: false })
      .order("name");
    if (error) throw error;
    return Response.json({ ok: true, cashiers: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    return jsonError("Daftar kasir belum dapat dibuka.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if ((action === "create" || action === "update") && !name) return jsonError("Nama kasir wajib diisi.");
    if (name.length > 100) return jsonError("Nama kasir terlalu panjang.");
    if (phone.length > 30) return jsonError("Nomor WhatsApp terlalu panjang.");

    if (action === "create") {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("cashiers").insert({
        id, owner_id: user.id, name, phone, is_active: true,
      });
      if (error) throw error;
      return Response.json({ ok: true, id });
    }

    if (action === "update") {
      const id = String(body.id ?? "");
      const { data, error } = await supabase.from("cashiers").update({
        name, phone, updated_at: new Date().toISOString(),
      }).eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Kasir tidak ditemukan.", 404);
      return Response.json({ ok: true, id });
    }

    if (action === "set_active") {
      const id = String(body.id ?? "");
      const isActive = body.isActive === true;
      const { data, error } = await supabase.from("cashiers").update({
        is_active: isActive, updated_at: new Date().toISOString(),
      }).eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Kasir tidak ditemukan.", 404);
      return Response.json({ ok: true, id });
    }

    return jsonError("Tindakan tidak dikenal.");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return jsonError("Nama kasir tersebut sudah terdaftar.", 409);
    }
    return jsonError("Perubahan kasir belum dapat disimpan.", 500);
  }
}
