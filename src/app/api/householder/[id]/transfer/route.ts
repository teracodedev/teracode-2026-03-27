/**
 * 当主交代 API
 * POST /api/householder/[id]/transfer
 * body: { memberId: string }
 *
 * 処理:
 * 1. 指定した世帯員(memberId)を新しい戸主として作成
 * 2. 旧戸主を世帯員（元戸主）に降格
 * 3. 既存の世帯員を新戸主に移動
 * 4. 旧戸主レコードを削除
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id: oldHouseholderId } = await params;
  const { memberId } = await req.json();

  if (!memberId) {
    return NextResponse.json({ error: "memberIdは必須です" }, { status: 400 });
  }

  // 旧戸主と対象世帯員を取得
  const [oldHouseholder, member] = await Promise.all([
    prisma.householder.findUnique({
      where: { id: oldHouseholderId },
      include: { members: true },
    }),
    prisma.householderMember.findUnique({ where: { id: memberId } }),
  ]);

  if (!oldHouseholder) {
    return NextResponse.json({ error: "戸主が見つかりません" }, { status: 404 });
  }
  if (!member || member.householderId !== oldHouseholderId) {
    return NextResponse.json({ error: "世帯員が見つかりません" }, { status: 404 });
  }
  if (member.deathDate) {
    return NextResponse.json({ error: "故人を戸主にすることはできません" }, { status: 400 });
  }

  try {
    // トランザクションで当主交代を実行
    const result = await prisma.$transaction(async (tx) => {
      // familyRegisterId はユニーク制約があるため、先に旧戸主から外す
      await tx.householder.update({
        where: { id: oldHouseholderId },
        data: { familyRegisterId: null },
      });

      const hasOwnAddress =
        Boolean(member.postalCode?.trim()) ||
        Boolean(member.address1?.trim()) ||
        Boolean(member.address2?.trim()) ||
        Boolean(member.address3?.trim());

      const postalCode = hasOwnAddress ? member.postalCode || null : oldHouseholder.postalCode || null;
      const address1 = hasOwnAddress ? member.address1 || null : oldHouseholder.address1 || null;
      const address2 = hasOwnAddress ? member.address2 || null : oldHouseholder.address2 || null;
      const address3 = hasOwnAddress ? member.address3 || null : oldHouseholder.address3 || null;

      // 1. 新しい戸主を作成（世帯員のデータを引き継ぐ）
      const newHouseholder = await tx.householder.create({
        data: {
          familyName: member.familyName,
          givenName: member.givenName || "",
          familyNameKana: member.familyNameKana || null,
          givenNameKana: member.givenNameKana || null,
          gender: member.gender || null,
          birthDate: member.birthDate || null,
          deathDate: member.deathDate || null,
          dharmaName: member.dharmaName || null,
          dharmaNameKana: member.dharmaNameKana || null,
          postalCode,
          address1,
          address2,
          address3,
          phone1: member.phone1 || null,
          phone2: member.phone2 || null,
          fax: member.fax || null,
          email: member.email || null,
          domicile: member.domicile || null,
          note: member.note || null,
          familyRegisterId: oldHouseholder.familyRegisterId, // 同じ家族・親族台帳
          isActive: true,
          joinedAt: oldHouseholder.joinedAt,
        },
      });

      // 2. 当主交代した世帯員を削除（新戸主になった）
      await tx.householderMember.delete({ where: { id: memberId } });

      // 3. 残りの世帯員を新戸主に移動
      await tx.householderMember.updateMany({
        where: { householderId: oldHouseholderId },
        data: { householderId: newHouseholder.id },
      });

      // 4. 法要参加データも新戸主へ引き継ぐ
      await tx.ceremonyParticipant.updateMany({
        where: { householderId: oldHouseholderId },
        data: { householderId: newHouseholder.id },
      });

      // 4-2. 墓地契約: 旧戸主の使用履歴を保存し、墓地使用者を新戸主に更新
      const graveContracts = await tx.graveContract.findMany({
        where: { householderId: oldHouseholderId },
      });
      const transferDate = new Date();
      for (const contract of graveContracts) {
        await tx.graveContractHistory.create({
          data: {
            graveContractId: contract.id,
            householderName: `${oldHouseholder.familyName}${oldHouseholder.givenName ? " " + oldHouseholder.givenName : ""}`,
            householderKana:
              oldHouseholder.familyNameKana || oldHouseholder.givenNameKana
                ? `${oldHouseholder.familyNameKana || ""}${oldHouseholder.givenNameKana ? " " + oldHouseholder.givenNameKana : ""}`.trim()
                : null,
            startDate: contract.startDate,
            endDate: transferDate,
            transferredAt: transferDate,
            note: contract.note,
          },
        });
        await tx.graveContract.update({
          where: { id: contract.id },
          data: {
            householderId: newHouseholder.id,
            startDate: contract.startDate,
            endDate: null,
          },
        });
      }

      // 5. 旧戸主を世帯員（元戸主）として新戸主配下に追加
      await tx.householderMember.create({
        data: {
          householderId: newHouseholder.id,
          familyName: oldHouseholder.familyName,
          givenName: oldHouseholder.givenName || null,
          familyNameKana: oldHouseholder.familyNameKana || null,
          givenNameKana: oldHouseholder.givenNameKana || null,
          gender: oldHouseholder.gender || null,
          birthDate: oldHouseholder.birthDate || null,
          deathDate: oldHouseholder.deathDate || null,
          dharmaName: oldHouseholder.dharmaName || null,
          dharmaNameKana: oldHouseholder.dharmaNameKana || null,
          postalCode: oldHouseholder.postalCode || null,
          address1: oldHouseholder.address1 || null,
          address2: oldHouseholder.address2 || null,
          address3: oldHouseholder.address3 || null,
          phone1: oldHouseholder.phone1 || null,
          phone2: oldHouseholder.phone2 || null,
          fax: oldHouseholder.fax || null,
          email: oldHouseholder.email || null,
          domicile: oldHouseholder.domicile || null,
          note: oldHouseholder.note || null,
          relation: oldHouseholder.relation || null,
        },
      });

      // 6. 旧戸主レコードを削除
      await tx.householder.delete({ where: { id: oldHouseholderId } });

      return newHouseholder;
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("transfer householder failed:", error);
    return NextResponse.json({ error: "戸主交代に失敗しました" }, { status: 500 });
  }
}
