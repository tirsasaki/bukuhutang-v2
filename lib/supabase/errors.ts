export function isMissingDatabaseSchema(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PGRST205",
  );
}

export const databaseSetupMessage =
  "Basis data Supabase belum disiapkan. Jalankan berkas supabase/schema.sql di SQL Editor Supabase terlebih dahulu.";
