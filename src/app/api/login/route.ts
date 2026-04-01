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
  // application/json のみ受け付ける（CSRF 対策）
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  let email: unknown, password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
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

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: useSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
