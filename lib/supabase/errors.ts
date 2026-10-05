export function isMissingDatabaseSchema(error: unknown): boolean {
  let current = error;

  while (current && typeof current === "object") {
    if ("code" in current && current.code === "PGRST205") return true;
    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

export const databaseSetupMessage =
  "Basis data Supabase belum disiapkan. Jalankan berkas supabase/schema.sql di SQL Editor Supabase terlebih dahulu.";
