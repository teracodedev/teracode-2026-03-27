/**
 * 墓地契約の startDate / usageStartDate を、履歴と現契約から復元できる最も早い使用開始日に揃える。
 * （旧仕様の戸主譲渡で譲渡日に上書きされたレコードの復旧用）
 *
 * 使い方:
 * - Dry run:  npx tsx scripts/repair-grave-contract-start-dates.ts
 * - Apply:    npx tsx scripts/repair-grave-contract-start-dates.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import { earliestGraveContractStartDate } from "../src/lib/grave-contract-start-date";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const contracts = await prisma.graveContract.findMany({
    include: { histories: true },
  });

  let fixCount = 0;
  for (const c of contracts) {
    const correct = earliestGraveContractStartDate(c.startDate, c.histories);
    if (correct === null) continue;

    const startMatch = c.startDate?.getTime() === correct.getTime();
    const usageMatch = c.usageStartDate?.getTime() === correct.getTime();
    if (startMatch && usageMatch) continue;

    fixCount++;
    const label = `${c.id}  start ${c.startDate?.toISOString() ?? "null"} usage ${c.usageStartDate?.toISOString() ?? "null"} → ${correct.toISOString()}`;
    console.log(APPLY ? `更新: ${label}` : `予定: ${label}`);

    if (APPLY) {
      await prisma.graveContract.update({
        where: { id: c.id },
        data: {
          startDate: correct,
          usageStartDate: correct,
        },
      });
    }
  }

  if (fixCount === 0) {
    console.log("✅ 修正が必要な墓地契約はありませんでした。");
  } else {
    console.log(
      APPLY
        ? `✅ ${fixCount} 件を更新しました。`
        : `⚠ ${fixCount} 件が修正対象です。反映するには --apply を付けて実行してください。`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
