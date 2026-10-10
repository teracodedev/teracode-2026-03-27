import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";

// メンバーのタグ一覧取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const tags = await prisma.memberTag.findMany({
    where: { memberId: id },
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  });
  return NextResponse.json(tags.map((t) => t.tag));
}

// タグ付与
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const { tagId } = await request.json();
  if (typeof tagId !== "string" || !tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }
  try {
    await prisma.memberTag.upsert({
      where: { memberId_tagId: { memberId: id, tagId } },
      create: { memberId: id, tagId },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(`POST /api/members/${id}/tags`, e, "タグの付与に失敗しました");
  }
}

// タグ解除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const { tagId } = await request.json();
  // 文字列以外（{ not: "..." } 等）を通すと where 条件として解釈され、複数のタグが外れてしまう
  if (typeof tagId !== "string" || !tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }
  await prisma.memberTag.deleteMany({
    where: { memberId: id, tagId },
  });
  return NextResponse.json({ ok: true });
}
