import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const relatedHouseholderSelect = {
  id: true,
  familyName: true,
  givenName: true,
  familyNameKana: true,
  givenNameKana: true,
  familyRegisterId: true,
  isActive: true,
} as const;

function normalizeLink(
  householderId: string,
  link: {
    id: string;
    householderId: string;
    relatedHouseholderId: string;
    relation: string | null;
    createdAt: Date;
    updatedAt: Date;
    householder: {
      id: string;
      familyName: string;
      givenName: string;
      familyNameKana: string | null;
      givenNameKana: string | null;
      familyRegisterId: string | null;
      isActive: boolean;
    };
    relatedHouseholder: {
      id: string;
      familyName: string;
      givenName: string;
      familyNameKana: string | null;
      givenNameKana: string | null;
      familyRegisterId: string | null;
      isActive: boolean;
    };
  },
) {
  const related =
    link.householderId === householderId ? link.relatedHouseholder : link.householder;
  return {
    id: link.id,
    relation: link.relation,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    relatedHouseholder: related,
  };
}

// 関係先一覧
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id: householderId } = await params;

  try {
    const links = await prisma.relatedLedger.findMany({
      where: {
        OR: [{ householderId }, { relatedHouseholderId: householderId }],
      },
      include: {
        householder: { select: relatedHouseholderSelect },
        relatedHouseholder: { select: relatedHouseholderSelect },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(links.map((link) => normalizeLink(householderId, link)));
  } catch (error) {
    return apiErrorResponse(`GET /api/householder/${householderId}/related-ledgers`, error);
  }
}

// 関係先追加
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id: householderId } = await params;

  try {
    const body = await req.json();
    const relatedHouseholderId = body.relatedHouseholderId as string | undefined;
    const relation = typeof body.relation === "string" ? body.relation.trim() || null : null;

    if (!relatedHouseholderId) {
      return NextResponse.json({ error: "関係先の戸主は必須です" }, { status: 400 });
    }
    if (relatedHouseholderId === householderId) {
      return NextResponse.json({ error: "自分自身を関係先にはできません" }, { status: 400 });
    }

    const [self, related] = await Promise.all([
      prisma.householder.findUnique({ where: { id: householderId }, select: { id: true } }),
      prisma.householder.findUnique({
        where: { id: relatedHouseholderId },
        select: relatedHouseholderSelect,
      }),
    ]);
    if (!self) return NextResponse.json({ error: "戸主が見つかりません" }, { status: 404 });
    if (!related) return NextResponse.json({ error: "関係先の戸主が見つかりません" }, { status: 404 });

    const existing = await prisma.relatedLedger.findFirst({
      where: {
        OR: [
          { householderId, relatedHouseholderId },
          { householderId: relatedHouseholderId, relatedHouseholderId: householderId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: "すでに関係先として登録されています" }, { status: 409 });
    }

    const link = await prisma.relatedLedger.create({
      data: {
        householderId,
        relatedHouseholderId,
        relation,
      },
      include: {
        householder: { select: relatedHouseholderSelect },
        relatedHouseholder: { select: relatedHouseholderSelect },
      },
    });

    return NextResponse.json(normalizeLink(householderId, link), { status: 201 });
  } catch (error) {
    return apiErrorResponse(
      `POST /api/householder/${householderId}/related-ledgers`,
      error,
      "登録に失敗しました",
    );
  }
}
