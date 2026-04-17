import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * next-action の値はデプロイや Next の版で 40 桁（SHA-1）／42 桁のどちらかになる。
 * ログに出ていた "x" のような明らかなゴミだけ弾く（英数字 hex の固定長）。
 */
const SERVER_ACTION_ID_RE = /^(?:[0-9a-f]{40}|[0-9a-f]{42})$/i;

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // /login や /api を先に next() すると、そこへの POST（next-action: x 等）が検査をすり抜けて
  // Next の action-handler まで届き、error ログが埋まる。形式チェックは常に最初に行う。
  if (req.method === "POST") {
    const nextAction = req.headers.get("next-action");
    if (nextAction !== null && !SERVER_ACTION_ID_RE.test(nextAction)) {
      const xf = req.headers.get("x-forwarded-for");
      console.warn("[server-action] invalid next-action header (rejected)", {
        pathname,
        actionLen: nextAction.length,
        actionSample: nextAction.slice(0, 80),
        userAgent: req.headers.get("user-agent"),
        forwardedFor: xf?.split(",")[0]?.trim() ?? null,
        referer: req.headers.get("referer"),
      });
      return new NextResponse(null, { status: 400 });
    }
  }

  if (pathname === "/login" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[middleware]", pathname, {
      isLoggedIn,
      auth: req.auth ? { user: req.auth.user?.email } : null,
      cookies: req.cookies.getAll().map((c) => ({ name: c.name, len: c.value.length })),
    });
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/|_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    "/",
  ],
};
