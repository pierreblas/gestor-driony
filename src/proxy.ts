import { NextResponse, type NextRequest } from "next/server";

// Kept in sync with src/lib/auth/session.ts (the proxy can't import server-only modules).
const SESSION_COOKIE = "driony_sesion";
const SESSION_MAX_AGE = 90 * 86_400;

const PUBLIC_PATHS = ["/login", "/recuperar", "/contrasena", "/primer-acceso"];

/**
 * Fast check only: without a session cookie, go to /login. The real session check
 * happens in every page and Server Action. With a cookie, its lifetime is renewed so
 * people who use the app stay signed in.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" || pathname === "/mis-tareas" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (token && request.method === "GET") {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.COOKIE_SECURE !== "false" && (process.env.APP_URL ?? "").startsWith("https://")),
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
