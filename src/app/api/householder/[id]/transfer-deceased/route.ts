/**
 * 戸主を過去帳へ移動 API
 * POST /api/householder/[id]/transfer-deceased
 * body: { memberId: string, deathDate: string, dharmaName?: string, dharmaNameKana?: string }
 *
 * 処理:
 * 1. 選択した世帯員(memberId)を新しい戸主として作成
 * 2. 旧戸主を故人（過去帳）として世帯員に追加（deathDate付き）
 * 3. 既存の世帯員を新戸主に移動
 * 4. 法要参加データを新戸主へ引き継ぎ
 * 5. 旧戸主レコードを削除
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
  const { memberId, deathDate, dharmaName, dharmaNameKana } = await req.json();

  if (!memberId) {
    return NextResponse.json({ error: "memberIdは必須です" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "故人を新しい戸主にすることはできません" }, { status: 400 });
  }

  try {
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
      const address1   = hasOwnAddress ? member.address1   || null : oldHouseholder.address1   || null;
      const address2   = hasOwnAddress ? member.address2   || null : oldHouseholder.address2   || null;
      const address3   = hasOwnAddress ? member.address3   || null : oldHouseholder.address3   || null;

      // 1. 新しい戸主を作成
      const newHouseholder = await tx.householder.create({
        data: {
          familyName:      member.familyName,
          givenName:       member.givenName || "",
          familyNameKana:  member.familyNameKana  || null,
          givenNameKana:   member.givenNameKana   || null,
          gender:          member.gender          || null,
          birthDate:       member.birthDate       || null,
          postalCode,
          address1,
          address2,
          address3,
          phone1:          member.phone1    || null,
          phone2:          member.phone2    || null,
          fax:             member.fax       || null,
          email:           member.email     || null,
          domicile:        member.domicile  || null,
          note:            member.note      || null,
          familyRegisterId: oldHouseholder.familyRegisterId,
          isActive:        true,
          joinedAt:        oldHouseholder.joinedAt,
        },
      });

      // 2. 昇格した世帯員を削除
      await tx.householderMember.delete({ where: { id: memberId } });

      // 3. 残りの世帯員を新戸主へ移動
      await tx.householderMember.updateMany({
        where: { householderId: oldHouseholderId },
        data:  { householderId: newHouseholder.id },
      });

      // 4. 法要参加データを新戸主へ引き継ぎ
      await tx.ceremonyParticipant.updateMany({
        where: { householderId: oldHouseholderId },
        data:  { householderId: newHouseholder.id },
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
            startDate: transferDate,
            endDate: null,
          },
        });
      }

      // 5. 旧戸主を故人（過去帳）として新戸主配下の世帯員に追加
      await tx.householderMember.create({
        data: {
          householderId:  newHouseholder.id,
          familyName:     oldHouseholder.familyName,
          givenName:      oldHouseholder.givenName    || null,
          familyNameKana: oldHouseholder.familyNameKana || null,
          givenNameKana:  oldHouseholder.givenNameKana  || null,
          gender:         oldHouseholder.gender         || null,
          birthDate:      oldHouseholder.birthDate      || null,
          deathDate:      deathDate ? new Date(deathDate) : null,
          dharmaName:     dharmaName     || null,
          dharmaNameKana: dharmaNameKana || null,
          postalCode:     oldHouseholder.postalCode || null,
          address1:       oldHouseholder.address1   || null,
          address2:       oldHouseholder.address2   || null,
          address3:       oldHouseholder.address3   || null,
          phone1:         oldHouseholder.phone1     || null,
          phone2:         oldHouseholder.phone2     || null,
          fax:            oldHouseholder.fax        || null,
          email:          oldHouseholder.email      || null,
          domicile:       oldHouseholder.domicile   || null,
          note:           oldHouseholder.note       || null,
          relation:       oldHouseholder.relation   || null,
        },
      });

      // 6. 旧戸主レコードを削除
      await tx.householder.delete({ where: { id: oldHouseholderId } });

      return newHouseholder;
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("transfer-deceased failed:", error);
    return NextResponse.json({ error: "操作に失敗しました" }, { status: 500 });
  }
}
