import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

const useSecure = process.env.AUTH_URL?.startsWith("https:") ?? false;
const SESSION_COOKIE = useSecure
  ? "__Host-authjs.session-token"
  : "authjs.session-token";

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll().map((c) => ({
    name: c.name,
    valueLen: c.value.length,
  }));

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  let decoded = null;
  let decodeError = null;

  if (sessionCookie) {
    try {
      decoded = await decode({
        token: sessionCookie.value,
        secret: process.env.AUTH_SECRET!,
        salt: SESSION_COOKIE,
      });
    } catch (e) {
      decodeError = String(e);
    }
  }

  return NextResponse.json({
    expectedCookieName: SESSION_COOKIE,
    useSecure,
    authUrl: process.env.AUTH_URL,
    cookies: allCookies,
    hasSessionCookie: !!sessionCookie,
    decoded,
    decodeError,
  });
}
