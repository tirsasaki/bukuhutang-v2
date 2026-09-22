import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { retrySupabaseRequest } from "./retry";

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
  const { data, error } = await retrySupabaseRequest(() =>
    supabase.auth.getUser(),
  );

  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return { supabase, user: data.user };
}
