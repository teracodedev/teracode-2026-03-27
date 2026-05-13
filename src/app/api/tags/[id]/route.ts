import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// タグ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, color } = await request.json();
  if (name !== undefined && name !== null && !String(name).trim()) {
    return NextResponse.json({ error: "タグ名を入力してください" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name !== undefined && name !== null ? { name: String(name).trim() } : {}),
        ...(color ? { color } : {}),
      },
    });
    return NextResponse.json(tag);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
    }
    throw e;
  }
}

// タグ削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
