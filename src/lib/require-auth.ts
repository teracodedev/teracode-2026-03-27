import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

/**
 * セッションのユーザーを DB から取得する。
 * JWT は署名が有効な限り期限まで使えるため、削除されたユーザーや管理者権限を外されたユーザーが
 * 古いトークンで操作できないよう、存在と権限は毎回 DB の値で判定する。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || id === "") return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
}

/**
 * API ルートで認証を要求するユーティリティ。
 * セッションがなければ 401 レスポンスを返す。
 *
 * Usage:
 *   const unauth = await requireAuth();
 *   if (unauth) return unauth;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * 管理者権限を要求する。未ログインは 401、一般ユーザーは 403。
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
