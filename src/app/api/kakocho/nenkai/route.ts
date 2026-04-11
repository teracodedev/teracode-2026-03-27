import { NextRequest, NextResponse } from "next/server";
import { getHouseholderFieldMap, getHouseholderModelKind, getMemberDelegate } from "@/lib/prisma-models";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

// この寺院で案内する年回(回忌)とその「死後経過年数」
//   1周忌 = 死後 1 年
//   3回忌 = 死後 2 年
//   7回忌 = 死後 6 年
//   ... 50回忌 = 死後 49 年, 100回忌 = 死後 99 年
const KAIKI_TABLE: { kaiki: number; delta: number; label: string }[] = [
  { kaiki: 1,   delta: 1,  label: "一周忌"   },
  { kaiki: 3,   delta: 2,  label: "三回忌"   },
  { kaiki: 7,   delta: 6,  label: "七回忌"   },
  { kaiki: 13,  delta: 12, label: "十三回忌" },
  { kaiki: 17,  delta: 16, label: "十七回忌" },
  { kaiki: 25,  delta: 24, label: "二十五回忌" },
  { kaiki: 33,  delta: 32, label: "三十三回忌" },
  { kaiki: 50,  delta: 49, label: "五十回忌" },
  { kaiki: 100, delta: 99, label: "百回忌"   },
];

export async function GET(request: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const sp = request.nextUrl.searchParams;
  const yearStr  = sp.get("year");
  const monthStr = sp.get("month");
  const year  = yearStr  ? parseInt(yearStr,  10) : NaN;
  const month = monthStr ? parseInt(monthStr, 10) : NaN;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "year(西暦) と month(1-12) を指定してください" }, { status: 400 });
  }

  // 命日年が候補となる西暦の集合を計算 (year - delta)
  const targetDeathYears = KAIKI_TABLE.map((r) => year - r.delta).filter((y) => y > 0);
  const minYear = Math.min(...targetDeathYears);
  const maxYear = Math.max(...targetDeathYears);

  try {
    const kind = getHouseholderModelKind();
    const memberDelegate = getMemberDelegate() as { findMany: (args: unknown) => Promise<unknown> };
    const fields = getHouseholderFieldMap(kind);
    const relationName = fields.relation;

    // 一旦 死亡年範囲 で広く絞る → アプリ側で月と回忌一致を判定
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deathDate: {
        gte: new Date(`${minYear}-01-01T00:00:00`),
        lte: new Date(`${maxYear}-12-31T23:59:59`),
      },
    };

    const records = (await memberDelegate.findMany({
      where,
      include: {
        [relationName]: {
          select: {
            id: true,
            [fields.code]: true,
            familyName: true,
            givenName: true,
            familyNameKana: true,
            givenNameKana: true,
            postalCode: true,
            address1: true,
            address2: true,
            address3: true,
          },
        },
      },
    })) as Array<Record<string, unknown>>;

    type Item = {
      memberId: string;
      familyName: string;
      givenName: string | null;
      dharmaName: string | null;
      relation: string | null;
      ageAtDeath: string | null;
      deathDate: string;
      kaiki: number;
      kaikiLabel: string;
      householder: {
        id: string;
        code: string;
        familyName: string;
        givenName: string;
        familyNameKana: string | null;
        givenNameKana: string | null;
        postalCode: string | null;
        address1: string | null;
        address2: string | null;
        address3: string | null;
      };
    };

    const items: Item[] = [];
    for (const r of records) {
      const dd = r.deathDate ? new Date(r.deathDate as string) : null;
      if (!dd) continue;
      if (dd.getMonth() + 1 !== month) continue;
      const dy = dd.getFullYear();
      const hit = KAIKI_TABLE.find((k) => year - dy === k.delta);
      if (!hit) continue;
      const h = (r as Record<string, unknown>)[relationName] as Record<string, unknown> | null;
      if (!h) continue;
      items.push({
        memberId: String(r.id),
        familyName: String(r.familyName ?? ""),
        givenName: (r.givenName as string) ?? null,
        dharmaName: (r.dharmaName as string) ?? null,
        relation: (r.relation as string) ?? null,
        ageAtDeath: (r.ageAtDeath as string) ?? null,
        deathDate: dd.toISOString(),
        kaiki: hit.kaiki,
        kaikiLabel: hit.label,
        householder: {
          id: String(h.id),
          code: String(h[fields.code] ?? ""),
          familyName: String(h.familyName ?? ""),
          givenName: String(h.givenName ?? ""),
          familyNameKana: (h.familyNameKana as string) ?? null,
          givenNameKana: (h.givenNameKana as string) ?? null,
          postalCode: (h.postalCode as string) ?? null,
          address1: (h.address1 as string) ?? null,
          address2: (h.address2 as string) ?? null,
          address3: (h.address3 as string) ?? null,
        },
      });
    }

    // 命日昇順
    items.sort((a, b) => {
      const am = new Date(a.deathDate).getDate();
      const bm = new Date(b.deathDate).getDate();
      return am - bm;
    });

    return NextResponse.json({ year, month, items });
  } catch (error) {
    console.error("GET /api/kakocho/nenkai error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}
