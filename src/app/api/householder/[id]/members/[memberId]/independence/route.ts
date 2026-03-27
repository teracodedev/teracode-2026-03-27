/**
 * 世帯の独立 API
 * POST /api/householder/[id]/members/[memberId]/independence
 *
 * 処理:
 * 1. 世帯員を新しい戸主として作成
 * 2. 新しい家族・親族台帳を作成して紐付け
 * 3. 元の世帯員レコードを削除
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; memberId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { memberId } = await params;

  const member = await prisma.householderMember.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "世帯員が見つかりません" }, { status: 404 });
  if (member.deathDate) return NextResponse.json({ error: "故人は世帯の独立ができません" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const familyRegister = await tx.familyRegister.create({
      data: { name: `${member.familyName}${member.givenName || ""}の家族・親族台帳` },
    });
    const newHouseholder = await tx.householder.create({
      data: {
        familyName: member.familyName,
        givenName: member.givenName || "",
        familyNameKana: member.familyNameKana || null,
        givenNameKana: member.givenNameKana || null,
        gender: member.gender || null,
        birthDate: member.birthDate || null,
        postalCode: member.postalCode || null,
        address1: member.address1 || null,
        address2: member.address2 || null,
        address3: member.address3 || null,
        phone1: member.phone1 || null,
        phone2: member.phone2 || null,
        fax: member.fax || null,
        email: member.email || null,
        domicile: member.domicile || null,
        note: member.note || null,
        familyRegisterId: familyRegister.id,
        isActive: true,
      },
    });
    await tx.householderMember.delete({ where: { id: memberId } });
    return { newHouseholder, familyRegister };
  });

  return NextResponse.json({
    householderId: result.newHouseholder.id,
    familyRegisterId: result.familyRegister.id,
  });
}
