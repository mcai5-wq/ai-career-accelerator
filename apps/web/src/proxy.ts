import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Just an optimistic redirect based on the session cookie — the real checks
// happen in the (dashboard) layout and on every API request.
const protectedPrefixes = ["/dashboard"];
const authOnlyRoutes = ["/login", "/register", "/forgot-password"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthRoute = authOnlyRoutes.includes(pathname);

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Skip API routes, static assets, and image optimization requests.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)"],
};
