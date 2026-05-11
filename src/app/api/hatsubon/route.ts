import { NextResponse } from "next/server";
import {
  getHouseholderDelegate,
  getHouseholderFieldMap,
  getHouseholderModelKind,
  getMemberDelegate,
} from "@/lib/prisma-models";
import { requireAuth } from "@/lib/require-auth";
import { compareHouseholderGojuon } from "@/lib/householder-sort";

export const runtime = "nodejs";

/**
 * 初盆対象者を返す。
 * 昨年 8/17 〜 本日 の間に亡くなった物故者がいる戸主を抽出する。
 * 同一戸主に複数の物故者がいても宛名は 1 枚のみ（重複排除済み）。
 */
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const today = new Date();
  const lastYear = today.getFullYear() - 1;
  const fromDate = new Date(`${lastYear}-08-17T00:00:00`);
  const toDate = new Date(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T23:59:59`,
  );

  try {
    const kind = getHouseholderModelKind();
    const memberDelegate = getMemberDelegate() as { findMany: (args: unknown) => Promise<unknown> };
    const householderDelegate = getHouseholderDelegate() as {
      findMany: (args: unknown) => Promise<unknown>;
    };
    const fields = getHouseholderFieldMap(kind);
    const relationName = fields.relation;

    const where = {
      deathDate: { gte: fromDate, lte: toDate },
    };

    const memberWhere = { ...where, annaiFuyo: false };

    const memberRecords = (await memberDelegate.findMany({
      where: memberWhere,
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

    const householderRecords = (await householderDelegate.findMany({
      where,
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
        deathDate: true,
        ageAtDeath: true,
        dharmaName: true,
      },
    })) as Array<Record<string, unknown>>;

    const records: Array<Record<string, unknown>> = [
      ...memberRecords,
      ...householderRecords.map((h) => ({
        id: `householder:${String(h.id)}`,
        familyName: h.familyName,
        givenName: h.givenName,
        familyNameKana: h.familyNameKana,
        givenNameKana: h.givenNameKana,
        dharmaName: h.dharmaName,
        relation: "戸主",
        ageAtDeath: h.ageAtDeath,
        deathDate: h.deathDate,
        [relationName]: {
          id: h.id,
          [fields.code]: h[fields.code],
          familyName: h.familyName,
          givenName: h.givenName,
          familyNameKana: h.familyNameKana,
          givenNameKana: h.givenNameKana,
          postalCode: h.postalCode,
          address1: h.address1,
          address2: h.address2,
          address3: h.address3,
        },
      })),
    ];

    type Householder = {
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

    type DeceasedItem = {
      memberId: string;
      familyName: string;
      givenName: string | null;
      dharmaName: string | null;
      relation: string | null;
      ageAtDeath: string | null;
      deathDate: string;
    };

    type HatsubonItem = {
      householder: Householder;
      deceased: DeceasedItem[];
    };

    const householderMap = new Map<string, HatsubonItem>();

    for (const r of records) {
      const dd = r.deathDate ? new Date(r.deathDate as string) : null;
      if (!dd || dd < fromDate || dd > toDate) continue;

      const h = (r as Record<string, unknown>)[relationName] as Record<string, unknown> | null;
      if (!h) continue;

      const hId = String(h.id);
      if (!householderMap.has(hId)) {
        householderMap.set(hId, {
          householder: {
            id: hId,
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
          deceased: [],
        });
      }

      householderMap.get(hId)!.deceased.push({
        memberId: String(r.id),
        familyName: String(r.familyName ?? ""),
        givenName: (r.givenName as string) ?? null,
        dharmaName: (r.dharmaName as string) ?? null,
        relation: (r.relation as string) ?? null,
        ageAtDeath: (r.ageAtDeath as string) ?? null,
        deathDate: dd.toISOString(),
      });
    }

    const items = Array.from(householderMap.values());

    items.sort((a, b) =>
      compareHouseholderGojuon(a.householder, b.householder),
    );

    return NextResponse.json({
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      items,
    });
  } catch (error) {
    console.error("GET /api/hatsubon error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 },
    );
  }
}
