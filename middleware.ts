import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // デバッグログ
  console.log("[middleware]", pathname, {
    isLoggedIn,
    auth: req.auth ? { user: req.auth.user?.email } : null,
    cookies: req.cookies.getAll().map((c) => ({ name: c.name, len: c.value.length })),
  });

  // 未ログインはログインページへ
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 管理者専用パス
  if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/admin",
    "/admin/:path*",
    "/ceremonies",
    "/ceremonies/:path*",
    "/family-register",
    "/family-register/:path*",
    "/genzaicho",
    "/householder",
    "/householder/:path*",
    "/kakocho",
  ],
};
