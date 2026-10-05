import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isUnauthenticatedSupabaseError,
  retrySupabaseRequest,
} from "@/lib/supabase/retry";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const authResult = await retrySupabaseRequest(() =>
    supabase.auth.getUser(),
  ).catch((error: unknown) => ({ data: { user: null }, error }));
  const {
    data: { user },
    error,
  } = authResult;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const sessionMissing =
    (!error && !user) ||
    (Boolean(error) && isUnauthenticatedSupabaseError(error));
  const isAuthenticated = !error && Boolean(user);

  if (sessionMissing && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("lanjut", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
