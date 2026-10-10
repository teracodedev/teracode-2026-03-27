import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * next-action の値はデプロイや Next の版で 40 桁（SHA-1）／42 桁のどちらかになる。
 * ログに出ていた "x" のような明らかなゴミだけ弾く（英数字 hex の固定長）。
 */
const SERVER_ACTION_ID_RE = /^(?:[0-9a-f]{40}|[0-9a-f]{42})$/i;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * 状態を変更するリクエストが別オリジンのページから送られていないか（CSRF）を判定する。
 * SameSite=Lax の Cookie はサブドメインなど「同一サイト」からの送信までは防げないため、オリジン単位で照合する。
 * Origin も Sec-Fetch-Site もないリクエスト（curl など）はブラウザ経由の CSRF ではないため通す。
 */
function isCrossOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin !== null) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
      return new URL(origin).host !== host;
    } catch {
      return true; // "Origin: null" など
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    // Next.js はリクエストヘッダーの CSP から nonce を読み取り、自身のスクリプトに付与する（開発時の React Refresh は eval を使う）
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React の style 属性と印刷用 <style> に必要。nonce を併記すると unsafe-inline が無視されるため付けない
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // PostalCodeSearch が住所データを取得する
    `connect-src 'self' https://geolonia.github.io${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];
  if (process.env.AUTH_URL?.startsWith("https://")) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

const pageMiddleware = auth((req) => {
  const isLoggedIn = typeof req.auth?.user?.id === "string" && req.auth.user.id !== "";
  const { pathname } = req.nextUrl;

  if (process.env.NODE_ENV === "development") {
    console.log("[middleware]", pathname, {
      isLoggedIn,
      auth: req.auth ? { user: req.auth.user?.email } : null,
      cookies: req.cookies.getAll().map((c) => ({ name: c.name, len: c.value.length })),
    });
  }

  if (pathname !== "/login") {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // /login や /api を先に next() すると、そこへの不正な POST が検査をすり抜けるため、形式チェックは常に最初に行う。
  if (!SAFE_METHODS.has(req.method)) {
    const xf = req.headers.get("x-forwarded-for");

    const nextAction = req.headers.get("next-action");
    if (req.method === "POST" && nextAction !== null && !SERVER_ACTION_ID_RE.test(nextAction)) {
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

    if (isCrossOriginRequest(req)) {
      console.warn("[csrf] cross-origin request (rejected)", {
        method: req.method,
        pathname,
        origin: req.headers.get("origin"),
        secFetchSite: req.headers.get("sec-fetch-site"),
        forwardedFor: xf?.split(",")[0]?.trim() ?? null,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // API は各ルートの requireAuth / requireAdmin で認可する
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return pageMiddleware(req, event as unknown as Parameters<typeof pageMiddleware>[1]);
}

export const config = {
  matcher: [
    "/((?!api/|_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    "/api/:path*",
    "/",
    "/admin",
    "/admin/:path*",
    "/family-register",
    "/family-register/:path*",
    "/genzaicho",
    "/householder",
    "/householder/:path*",
    "/kakocho",
    "/print",
    "/print/:path*",
  ],
};
