import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

const parseNullableFloat = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateArea = (width: number | null, depth: number | null) => {
  if (width == null || depth == null) return null;
  return Math.round((width * depth) / 10000 * 10000) / 10000;
};

// 墓地詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const grave = await prisma.gravePlot.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            householder: {
              select: {
                id: true,
                familyName: true,
                givenName: true,
                familyRegister: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!grave) {
      return NextResponse.json({ error: "墓地が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(grave);
  } catch (error) {
    console.error("GET /api/graves/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// 墓地更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { plotNumber, area, width, depth, permanentUsageFee, managementFee, note } = body;
    const parsedWidth = parseNullableFloat(width);
    const parsedDepth = parseNullableFloat(depth);
    const parsedArea =
      parsedWidth !== undefined && parsedDepth !== undefined
        ? calculateArea(parsedWidth ?? null, parsedDepth ?? null)
        : parseNullableFloat(area);

    const grave = await prisma.gravePlot.update({
      where: { id },
      data: {
        plotNumber: plotNumber || undefined,
        area: parsedArea,
        width: parsedWidth,
        depth: parsedDepth,
        permanentUsageFee:
          permanentUsageFee !== undefined
            ? permanentUsageFee
              ? parseInt(permanentUsageFee)
              : null
            : undefined,
        managementFee:
          managementFee !== undefined
            ? managementFee
              ? parseInt(managementFee)
              : null
            : undefined,
        note: note !== undefined ? note || null : undefined,
      },
      include: {
        contracts: {
          include: {
            householder: {
              select: {
                id: true,
                familyName: true,
                givenName: true,
                familyRegister: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(grave);
  } catch (error) {
    console.error("PUT /api/graves/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// 墓地削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    await prisma.gravePlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/graves/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}
