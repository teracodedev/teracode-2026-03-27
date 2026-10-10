import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { MAX_TAG_NAME_LENGTH, isTagColor } from "@/lib/tag-input";

// タグ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { name, color } = await request.json();
  if (name !== undefined && name !== null && !String(name).trim()) {
    return NextResponse.json({ error: "タグ名を入力してください" }, { status: 400 });
  }
  if (name !== undefined && name !== null && String(name).trim().length > MAX_TAG_NAME_LENGTH) {
    return NextResponse.json({ error: `タグ名は${MAX_TAG_NAME_LENGTH}文字以内で入力してください` }, { status: 400 });
  }
  if (color && !isTagColor(color)) {
    return NextResponse.json({ error: "色の指定が正しくありません" }, { status: 400 });
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
    return apiErrorResponse(`PUT /api/tags/${id}`, e, "更新に失敗しました");
  }
}

// タグ削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(`DELETE /api/tags/${id}`, e, "削除に失敗しました");
  }
}
