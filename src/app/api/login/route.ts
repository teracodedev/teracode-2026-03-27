import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

// NextAuth の useSecureCookies 設定に合わせる
const useSecure = process.env.AUTH_URL?.startsWith("https:") ?? false;
const SESSION_COOKIE = useSecure
  ? "__Host-authjs.session-token"
  : "authjs.session-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30日

export async function POST(request: NextRequest) {
  let email: unknown, password: unknown;
  let callbackUrl = "/";

  const ct = request.headers.get("content-type") ?? "";

  if (ct.includes("application/x-www-form-urlencoded")) {
    // 通常のフォーム送信
    const formData = await request.formData();
    email = formData.get("email");
    password = formData.get("password");
    callbackUrl = (formData.get("callbackUrl") as string) || "/";
  } else if (ct.includes("application/json")) {
    // fetch() からの JSON リクエスト
    try {
      ({ email, password, callbackUrl } = await request.json());
      callbackUrl = callbackUrl || "/";
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return loginError(ct, callbackUrl, "メールアドレスまたはパスワードが正しくありません");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return loginError(ct, callbackUrl, "メールアドレスまたはパスワードが正しくありません");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return loginError(ct, callbackUrl, "メールアドレスまたはパスワードが正しくありません");
  }

  // NextAuth 互換の JWT を生成（salt = cookie名 が NextAuth v5 の仕様）
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    },
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE,
    maxAge: SESSION_MAX_AGE,
  });

  // callbackUrl のバリデーション（オープンリダイレクト防止）
  const safeCallback =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  // フォーム送信の場合は 302 リダイレクト、JSON の場合は 200
  const isForm = ct.includes("application/x-www-form-urlencoded");
  const baseUrl = process.env.AUTH_URL || `http://localhost:3000`;
  const response = isForm
    ? NextResponse.redirect(new URL(safeCallback, baseUrl), 302)
    : NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: useSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

function loginError(contentType: string, callbackUrl: string, message: string) {
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const baseUrl = process.env.AUTH_URL || `http://localhost:3000`;
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "credentials");
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl, 302);
  }
  return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}
