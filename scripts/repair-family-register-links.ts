/**
 * 家族・親族台帳リンク復旧スクリプト
 *
 * 使い方:
 * - Dry run:  npx tsx scripts/repair-family-register-links.ts
 * - Apply:    npx tsx scripts/repair-family-register-links.ts --apply
 *
 * 処理内容:
 * 1) familyRegisterId が null の戸主に対して家族・親族台帳を作成
 * 2) 作成した台帳を戸主に紐付け
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function buildRegisterName(familyName: string, givenName: string) {
  return `${familyName}${givenName}の家族・親族台帳`;
}

async function main() {
  const unlinked = await prisma.householder.findMany({
    where: { familyRegisterId: null },
    select: {
      id: true,
      familyName: true,
      givenName: true,
      familyNameKana: true,
      givenNameKana: true,
    },
    orderBy: [{ familyNameKana: "asc" }, { familyName: "asc" }],
  });

  if (unlinked.length === 0) {
    console.log("✅ 未リンクの戸主は見つかりませんでした。");
    return;
  }

  console.log(`⚠ 未リンクの戸主: ${unlinked.length}件`);
  for (const h of unlinked) {
    const name = `${h.familyName} ${h.givenName}`;
    console.log(`- ${name} (${h.id})`);
  }

  if (!APPLY) {
    console.log("\nDry run のため更新は行っていません。");
    console.log("適用する場合: npx tsx scripts/repair-family-register-links.ts --apply");
    return;
  }

  let repaired = 0;
  for (const h of unlinked) {
    const registerName = buildRegisterName(h.familyName, h.givenName);
    await prisma.$transaction(async (tx) => {
      const register = await tx.familyRegister.create({
        data: { name: registerName },
      });
      await tx.householder.update({
        where: { id: h.id },
        data: { familyRegisterId: register.id },
      });
    });
    repaired += 1;
  }

  console.log(`✅ 復旧完了: ${repaired}件`);
}

main()
  .catch((e) => {
    console.error("❌ 復旧に失敗しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
