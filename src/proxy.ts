import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normaliseSupabaseUrl } from "@/lib/env";

// Runs only for the dashboard. Refreshes the sign-in session and sends signed-out
// visitors to the login page. Every admin page and action also re-checks on the
// server, and the database enforces it again with row-level security.
export async function proxy(request: NextRequest) {
  const url = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname === "/admin/login";
  if (!url || !key) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isLogin) {
    const login = new URL("/admin/login", request.url);
    return NextResponse.redirect(login);
  }
  // Signed-in visitors on the login page are handled there (an account that is
  // signed in but not an admin must be able to see why and sign out).

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
