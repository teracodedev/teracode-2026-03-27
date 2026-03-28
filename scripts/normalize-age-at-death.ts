/**
 * ageAtDeath を漢数字から算用数字に正規化するスクリプト
 * 例: "八十二歳" → "82" / "九十才" → "90"
 * 実行: npx tsx scripts/normalize-age-at-death.ts
 */
import { prisma } from "../src/lib/prisma";

function kanjiAgeToNumber(s: string): number | null {
  const arabic = s.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
  const direct = arabic.match(/(\d+)/);
  if (direct) return parseInt(direct[1], 10);
  const map: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  };
  let n = 0;
  let cur = 0;
  for (const c of arabic.replace(/[歳才]/g, "")) {
    if (map[c] !== undefined) { cur = map[c]; continue; }
    if (c === "百") { n += (cur || 1) * 100; cur = 0; }
    else if (c === "十") { n += (cur || 1) * 10; cur = 0; }
  }
  n += cur;
  return n > 0 ? n : null;
}

async function main() {
  const members = await prisma.householderMember.findMany({
    where: { ageAtDeath: { not: null } },
    select: { id: true, ageAtDeath: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const m of members) {
    const raw = m.ageAtDeath!;
    // 既にアラビア数字のみ（"82" や "82歳" 形式）はスキップ
    if (/^\d+$/.test(raw)) { skipped++; continue; }

    const num = kanjiAgeToNumber(raw);
    if (num === null) {
      console.warn(`変換できないデータ: id=${m.id} ageAtDeath="${raw}"`);
      skipped++;
      continue;
    }
    await prisma.householderMember.update({
      where: { id: m.id },
      data: { ageAtDeath: String(num) },
    });
    updated++;
  }

  console.log(`完了: ${updated}件更新, ${skipped}件スキップ`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
