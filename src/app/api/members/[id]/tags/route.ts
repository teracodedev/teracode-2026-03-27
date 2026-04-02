import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// メンバーのタグ一覧取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  const { tagId } = await request.json();
  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }
  await prisma.memberTag.upsert({
    where: { memberId_tagId: { memberId: id, tagId } },
    create: { memberId: id, tagId },
    update: {},
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// タグ解除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tagId } = await request.json();
  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }
  await prisma.memberTag.deleteMany({
    where: { memberId: id, tagId },
  });
  return NextResponse.json({ ok: true });
}
