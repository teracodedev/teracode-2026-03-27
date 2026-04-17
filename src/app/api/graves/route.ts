import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { effectiveGraveContractStartDate } from "@/lib/grave-contract-start-date";

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

// 墓地一覧取得
export async function GET(request: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  try {
    const graves = await prisma.gravePlot.findMany({
      where: query
        ? {
            OR: [
              { plotNumber: { contains: query, mode: "insensitive" } },
              { note: { contains: query, mode: "insensitive" } },
              {
                contracts: {
                  some: {
                    householder: {
                      OR: [
                        { familyName: { contains: query, mode: "insensitive" } },
                        { givenName: { contains: query, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : undefined,
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
            histories: {
              orderBy: { transferredAt: "desc" },
            },
          },
        },
      },
      orderBy: { plotNumber: "asc" },
    });

    const normalized = graves.map((g) => ({
      ...g,
      contracts: g.contracts.map((c) => {
        const { histories, ...rest } = c;
        return {
          ...rest,
          startDate: effectiveGraveContractStartDate(c, histories),
        };
      }),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/graves error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// 墓地新規登録
export async function POST(request: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const body = await request.json();
    const { plotNumber, area, width, depth, permanentUsageFee, managementFee, note } = body;
    const parsedWidth = parseNullableFloat(width) ?? null;
    const parsedDepth = parseNullableFloat(depth) ?? null;
    const parsedArea =
      parsedWidth != null && parsedDepth != null
        ? calculateArea(parsedWidth, parsedDepth)
        : (parseNullableFloat(area) ?? null);

    if (!plotNumber) {
      return NextResponse.json(
        { error: "墓地番号は必須です" },
        { status: 400 }
      );
    }

    const existing = await prisma.gravePlot.findUnique({
      where: { plotNumber },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "同じ墓地番号が既に登録されています" },
        { status: 400 }
      );
    }

    const grave = await prisma.gravePlot.create({
      data: {
        plotNumber,
        area: parsedArea,
        width: parsedWidth,
        depth: parsedDepth,
        permanentUsageFee: permanentUsageFee ? parseInt(permanentUsageFee) : null,
        managementFee: managementFee ? parseInt(managementFee) : null,
        note: note || null,
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
            histories: {
              orderBy: { transferredAt: "desc" },
            },
          },
        },
      },
    });

    const normalized = {
      ...grave,
      contracts: grave.contracts.map((c) => {
        const { histories, ...rest } = c;
        return {
          ...rest,
          startDate: effectiveGraveContractStartDate(c, histories),
        };
      }),
    };

    return NextResponse.json(normalized, { status: 201 });
  } catch (error) {
    console.error("POST /api/graves error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}
