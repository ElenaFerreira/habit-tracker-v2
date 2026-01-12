import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const url = request.nextUrl;
  const isAppRoute = url.pathname.startsWith("/app");
  const isLogin = url.pathname.startsWith("/login");
  const isCallback = url.pathname.startsWith("/auth/callback");

  if (!isAppRoute || isLogin || isCallback) return response;

  const hasSbCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSbCookie) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
