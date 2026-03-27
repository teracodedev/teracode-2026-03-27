import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { id } = await params;
  try {
    const sermons = await (prisma as any).sermonRecord.findMany({
      where: { householderId: id },
      orderBy: { sermonDate: "desc" },
    });
    return NextResponse.json(sermons);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const { id } = await params;
  try {
    const { sermonDate, memberName, content } = await request.json();
    const sermon = await (prisma as any).sermonRecord.create({
      data: {
        householderId: id,
        sermonDate: sermonDate ? new Date(sermonDate) : null,
        memberName: memberName || null,
        content: content || null,
      },
    });
    return NextResponse.json(sermon, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
