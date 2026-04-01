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
    const histories = await prisma.householderAddressHistory.findMany({
      where: { householderId: id },
      orderBy: { movedAt: "desc" },
    });
    return NextResponse.json(histories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "履歴の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { postalCode, address1, address2, address3, note } = body;

    if (!postalCode && !address1 && !address2 && !address3) {
      return NextResponse.json({ error: "保存する住所がありません" }, { status: 400 });
    }

    const history = await prisma.householderAddressHistory.create({
      data: {
        householderId: id,
        postalCode: postalCode || null,
        address1: address1 || null,
        address2: address2 || null,
        address3: address3 || null,
        note: note || null,
      },
    });

    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "履歴の保存に失敗しました" }, { status: 500 });
  }
}
