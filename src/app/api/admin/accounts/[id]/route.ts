import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/require-auth";

const prisma = new PrismaClient();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const session = await auth();
  const { id } = await params;

  // 自分自身は削除できない
  if (id === session!.user!.id) {
    return NextResponse.json({ error: "自分自身のアカウントは削除できません" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
