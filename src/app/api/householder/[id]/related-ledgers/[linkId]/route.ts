import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; linkId: string }> };

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

async function findOwnedLink(householderId: string, linkId: string) {
  return prisma.relatedLedger.findFirst({
    where: {
      id: linkId,
      OR: [{ householderId }, { relatedHouseholderId: householderId }],
    },
  });
}

// 関係先更新
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id: householderId, linkId } = await params;

  try {
    const owned = await findOwnedLink(householderId, linkId);
    if (!owned) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const body = await req.json();
    const relation =
      body.relation === undefined
        ? undefined
        : typeof body.relation === "string"
          ? body.relation.trim() || null
          : null;
    const relatedHouseholderId =
      typeof body.relatedHouseholderId === "string" ? body.relatedHouseholderId : undefined;

    if (relatedHouseholderId) {
      if (relatedHouseholderId === householderId) {
        return NextResponse.json({ error: "自分自身を関係先にはできません" }, { status: 400 });
      }
      const related = await prisma.householder.findUnique({
        where: { id: relatedHouseholderId },
        select: { id: true },
      });
      if (!related) {
        return NextResponse.json({ error: "関係先の戸主が見つかりません" }, { status: 404 });
      }

      const duplicate = await prisma.relatedLedger.findFirst({
        where: {
          id: { not: linkId },
          OR: [
            { householderId, relatedHouseholderId },
            { householderId: relatedHouseholderId, relatedHouseholderId: householderId },
          ],
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: "すでに関係先として登録されています" }, { status: 409 });
      }
    }

    const link = await prisma.relatedLedger.update({
      where: { id: linkId },
      data: {
        ...(relation !== undefined ? { relation } : {}),
        ...(relatedHouseholderId
          ? {
              // 常に「現在の戸主 → 関係先」の向きに正規化して保存
              householderId,
              relatedHouseholderId,
            }
          : {}),
      },
      include: {
        householder: { select: relatedHouseholderSelect },
        relatedHouseholder: { select: relatedHouseholderSelect },
      },
    });

    return NextResponse.json(normalizeLink(householderId, link));
  } catch (error) {
    return apiErrorResponse(
      `PUT /api/householder/${householderId}/related-ledgers/${linkId}`,
      error,
      "更新に失敗しました",
    );
  }
}

// 関係先削除
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id: householderId, linkId } = await params;

  try {
    const owned = await findOwnedLink(householderId, linkId);
    if (!owned) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    await prisma.relatedLedger.delete({ where: { id: linkId } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    return apiErrorResponse(
      `DELETE /api/householder/${householderId}/related-ledgers/${linkId}`,
      error,
      "削除に失敗しました",
    );
  }
}
