import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; sermonId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { sermonId } = await params;
  try {
    await (prisma as any).sermonRecord.delete({ where: { id: sermonId } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { sermonId } = await params;
  try {
    const { sermonDate, memberName, content } = await request.json();
    const sermon = await (prisma as any).sermonRecord.update({
      where: { id: sermonId },
      data: {
        sermonDate: sermonDate ? new Date(sermonDate) : null,
        memberName: memberName || null,
        content: content || null,
      },
    });
    return NextResponse.json(sermon);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
