import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * API ルートで認証を要求するユーティリティ。
 * セッションがなければ 401 レスポンスを返す。
 *
 * Usage:
 *   const unauth = await requireAuth();
 *   if (unauth) return unauth;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * 管理者権限を要求する。未ログインは 401、一般ユーザーは 403。
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
