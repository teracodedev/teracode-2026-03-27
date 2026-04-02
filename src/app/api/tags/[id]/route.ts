import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// タグ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, color } = await request.json();
  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(color ? { color } : {}),
    },
  });
  return NextResponse.json(tag);
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
