import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 戸主のタグ一覧取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tags = await prisma.householderTag.findMany({
    where: { householderId: id },
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
  await prisma.householderTag.upsert({
    where: { householderId_tagId: { householderId: id, tagId } },
    create: { householderId: id, tagId },
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
  await prisma.householderTag.deleteMany({
    where: { householderId: id, tagId },
  });
  return NextResponse.json({ ok: true });
}
