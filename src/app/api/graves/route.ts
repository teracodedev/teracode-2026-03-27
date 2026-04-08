import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

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
          },
        },
      },
      orderBy: { plotNumber: "asc" },
    });

    return NextResponse.json(graves);
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
    const { plotNumber, area, permanentUsageFee, managementFee, note } = body;

    if (!plotNumber) {
      return NextResponse.json(
        { error: "墓地番号は必須です" },
        { status: 400 }
      );
    }

    const grave = await prisma.gravePlot.create({
      data: {
        plotNumber,
        area: area ? parseFloat(area) : null,
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
          },
        },
      },
    });

    return NextResponse.json(grave, { status: 201 });
  } catch (error) {
    console.error("POST /api/graves error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}
