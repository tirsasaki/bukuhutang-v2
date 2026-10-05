import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isRetryableSupabaseError,
  isUnauthenticatedSupabaseError,
  retrySupabaseRequest,
} from "./retry";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Proxy memperbarui sesi saat Server Component tidak dapat menulis kuki.
          }
        },
      },
    },
  );
}

export async function requireApiUser() {
  const supabase = await createSupabaseServerClient();
  let authResult;

  try {
    authResult = await retrySupabaseRequest(() => supabase.auth.getUser());
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : "Kesalahan autentikasi tidak dikenal";
    throw new Error(
      `Layanan autentikasi Supabase sementara tidak tersedia: ${message}`,
      { cause },
    );
  }

  const { data, error } = authResult;

  if (!error && !data.user) throw new Error("UNAUTHORIZED");
  if (error && isUnauthenticatedSupabaseError(error)) {
    throw new Error("UNAUTHORIZED");
  }
  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Kesalahan autentikasi tidak dikenal";
    const prefix = isRetryableSupabaseError(error)
      ? "Layanan autentikasi Supabase sementara tidak tersedia"
      : "Sesi Supabase tidak dapat diverifikasi";
    throw new Error(`${prefix}: ${message}`, { cause: error });
  }
  return { supabase, user: data.user };
}
