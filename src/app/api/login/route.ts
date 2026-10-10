import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { verifyCredentials } from "@/lib/credentials";
import { getClientIp } from "@/lib/login-throttle";
import { safeCallbackPath } from "@/lib/safe-redirect";
import {
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SEC,
  USE_SECURE_COOKIES,
} from "@/lib/session-config";

type LoginErrorReason = "credentials" | "rate_limited";

export async function POST(request: NextRequest) {
  let email: unknown, password: unknown;
  let callbackUrl: unknown = "/";

  const ct = request.headers.get("content-type") ?? "";
  const isForm = ct.includes("application/x-www-form-urlencoded");

  if (isForm) {
    // 通常のフォーム送信
    const formData = await request.formData();
    email = formData.get("email");
    password = formData.get("password");
    callbackUrl = formData.get("callbackUrl");
  } else if (ct.includes("application/json")) {
    // fetch() からの JSON リクエスト
    try {
      ({ email, password, callbackUrl } = await request.json());
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const safeCallback = safeCallbackPath(callbackUrl);

  const result = await verifyCredentials(email, password, getClientIp(request.headers));
  if (result.status !== "ok") {
    return loginError(isForm, safeCallback, result.status === "throttled" ? "rate_limited" : "credentials");
  }
  const { user } = result;

  // NextAuth 互換の JWT を生成（salt = cookie名 が NextAuth v5 の仕様）
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      loginAt: Math.floor(Date.now() / 1000),
    },
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_IDLE_TIMEOUT_SEC,
  });

  // フォーム送信の場合は 302 リダイレクト、JSON の場合は 200
  const response = isForm
    ? NextResponse.redirect(new URL(safeCallback, baseUrl()), 302)
    : NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_IDLE_TIMEOUT_SEC,
  });

  return response;
}

function baseUrl(): string {
  return process.env.AUTH_URL || "http://localhost:3000";
}

function loginError(isForm: boolean, callbackUrl: string, reason: LoginErrorReason) {
  if (isForm) {
    const loginUrl = new URL("/login", baseUrl());
    loginUrl.searchParams.set("error", reason);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl, 302);
  }
  return reason === "rate_limited"
    ? NextResponse.json({ error: "too_many_attempts" }, { status: 429 })
    : NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}
