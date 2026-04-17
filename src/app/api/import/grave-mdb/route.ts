import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import MDBReader from "mdb-reader";

export const runtime = "nodejs";

function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const dt = new Date(d as string);
  return isNaN(dt.getTime()) ? null : dt;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  const n = toNumber(v);
  return n !== null ? Math.round(n) : null;
}

function earlierDate(current: Date | null, next: Date | null): Date | null {
  if (!next) return current;
  if (!current || next.getTime() < current.getTime()) return next;
  return current;
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "ファイルが選択されていません" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let reader: MDBReader;
  try {
    reader = new MDBReader(buffer);
  } catch {
    return NextResponse.json(
      { error: "MDBファイルの読み込みに失敗しました" },
      { status: 400 }
    );
  }

  const tableNames = reader.getTableNames();
  if (!tableNames.includes("BOT020_墓地台帳")) {
    return NextResponse.json(
      {
        error:
          "BOT020_墓地台帳 テーブルが見つかりません。墓地管理用のMDBファイルを選択してください。",
      },
      { status: 400 }
    );
  }

  // Read tables
  const graveRows = reader.getTable("BOT020_墓地台帳").getData();
  const userRows = tableNames.includes("BOT040_使用者")
    ? reader.getTable("BOT040_使用者").getData()
    : [];

  const firstStartDateByPlotNumber = new Map<string, Date>();
  const fallbackStartDateByPlotNumber = new Map<string, Date>();
  /** 墓地台帳ID → 墓地番号（使用者履歴テーブルが番号を持たない場合の参照用） */
  const plotNumberByLedgerId = new Map<number, string>();

  for (const row of graveRows) {
    const plotNumber = str(row["墓地番号"]);
    if (!plotNumber) continue;

    const ledgerId = row["墓地台帳ID"] as number | undefined;
    if (ledgerId != null && !plotNumberByLedgerId.has(ledgerId)) {
      plotNumberByLedgerId.set(ledgerId, plotNumber);
    }

    const firstStartDate = earlierDate(
      firstStartDateByPlotNumber.get(plotNumber) ?? null,
      toDate(row["使用開始日"])
    );
    if (firstStartDate) {
      firstStartDateByPlotNumber.set(plotNumber, firstStartDate);
    }

    const fallbackStartDate = earlierDate(
      fallbackStartDateByPlotNumber.get(plotNumber) ?? null,
      toDate(row["許可年月日"])
    );
    if (fallbackStartDate) {
      fallbackStartDateByPlotNumber.set(plotNumber, fallbackStartDate);
    }
  }

  /**
   * Access の「使用者履歴」など、過去使用者の使用開始日が入るテーブルをマージする。
   * 区画ごとに最も早い使用開始日を契約開始（最初の使用者）とする。
   */
  function mergeUsageStartFromHistoryRows(rows: Record<string, unknown>[]) {
    for (const row of rows) {
      const start = toDate(row["使用開始日"]);
      if (!start) continue;

      let plotNumber = str(row["墓地番号"]);
      if (!plotNumber) {
        const ledgerId = row["墓地台帳ID"] as number | undefined;
        if (ledgerId != null) {
          plotNumber = plotNumberByLedgerId.get(ledgerId) ?? null;
        }
      }
      if (!plotNumber) continue;

      const merged = earlierDate(
        firstStartDateByPlotNumber.get(plotNumber) ?? null,
        start
      );
      if (merged) {
        firstStartDateByPlotNumber.set(plotNumber, merged);
      }
    }
  }

  const historyTableCandidates = tableNames.filter((name) => {
    if (name === "BOT020_墓地台帳" || name === "BOT040_使用者") return false;
    if (name.includes("使用者履歴") || name.includes("使用履歴")) return true;
    return false;
  });

  for (const tableName of historyTableCandidates) {
    try {
      mergeUsageStartFromHistoryRows(
        reader.getTable(tableName).getData() as Record<string, unknown>[]
      );
    } catch {
      // テーブル構造が異なる場合は無視
    }
  }

  // 明示名に無いが、使用開始日＋墓地参照があるテーブルを拾う（環境差吸収）
  for (const tableName of tableNames) {
    if (historyTableCandidates.includes(tableName)) continue;
    if (tableName === "BOT020_墓地台帳" || tableName === "BOT040_使用者") continue;
    try {
      const rows = reader.getTable(tableName).getData() as Record<
        string,
        unknown
      >[];
      if (rows.length === 0) continue;
      const sample = rows[0];
      if (!sample || !("使用開始日" in sample)) continue;
      if (!("墓地番号" in sample) && !("墓地台帳ID" in sample)) continue;
      mergeUsageStartFromHistoryRows(rows);
    } catch {
      // ignore
    }
  }

  const contractStartDate = (plotNumber: string) =>
    firstStartDateByPlotNumber.get(plotNumber) ??
    fallbackStartDateByPlotNumber.get(plotNumber) ??
    null;

  // Build user map: 台帳ID → user row
  const userMap = new Map<number, Record<string, unknown>>();
  for (const u of userRows) {
    const id = u["台帳ID"] as number;
    if (id != null) userMap.set(id, u);
  }

  // Build JIN台帳ID → Householder ID map (matching existing householders)
  const jinIds = new Set<number>();
  for (const u of userRows) {
    const jinId = u["JIN台帳ID"] as number;
    if (jinId) jinIds.add(jinId);
  }

  // Look up existing householders by householderCode or by name matching
  // We'll use JIN台帳ID to match by looking at import order
  const allHouseholders = await prisma.householder.findMany({
    select: {
      id: true,
      familyName: true,
      givenName: true,
      familyRegister: { select: { id: true, name: true } },
    },
  });

  // Build name → householder map for matching
  const nameToHouseholder = new Map<
    string,
    { id: string; familyName: string; givenName: string; familyRegister: { id: string; name: string } | null }
  >();
  for (const h of allHouseholders) {
    const key = `${h.familyName}${h.givenName}`.replace(/\s+/g, "");
    if (!nameToHouseholder.has(key)) {
      nameToHouseholder.set(key, h);
    }
  }

  // Clear existing grave data
  await prisma.graveContract.deleteMany();
  await prisma.gravePlot.deleteMany();

  let graveCount = 0;
  let contractCount = 0;
  let historyImported = 0;
  const errorList: string[] = [];
  /** 区画ごとの代表契約（最初の1件）— 使用者履歴の紐付け先 */
  const contractIdByPlotNumber = new Map<string, string>();

  for (const row of graveRows) {
    try {
      const plotNumber = str(row["墓地番号"]);
      if (!plotNumber) {
        errorList.push(
          `墓地台帳ID=${row["墓地台帳ID"]}: 墓地番号が空のためスキップ`
        );
        continue;
      }

      // Check for duplicate plotNumber (some MDB files have duplicates)
      const existing = await prisma.gravePlot.findUnique({
        where: { plotNumber },
      });
      if (existing) {
        // Add contract to existing plot instead
        const userId = row["使用者ID"] as number;
        if (userId) {
          const user = userMap.get(userId);
          if (user) {
            const userName = str(user["氏名"]);
            if (userName) {
              const nameKey = userName.replace(/[\s\u3000]+/g, "");
              const matched = nameToHouseholder.get(nameKey);
              if (matched) {
                const plotStart = contractStartDate(plotNumber);
                const created = await prisma.graveContract.create({
                  data: {
                    gravePlotId: existing.id,
                    householderId: matched.id,
                    usageStartDate: plotStart,
                    startDate: plotStart,
                    endDate: toDate(row["永代使用期限"]),
                    note: str(row["墓地台帳ﾒﾓ"]),
                  },
                });
                if (!contractIdByPlotNumber.has(plotNumber)) {
                  contractIdByPlotNumber.set(plotNumber, created.id);
                }
                contractCount++;
              }
            }
          }
        }
        continue;
      }

      const area = toNumber(row["面積"]);
      const widthM = toNumber(row["寸法横"]);
      const depthM = toNumber(row["寸法縦"]);
      const width = widthM !== null ? Math.round(widthM * 100 * 100) / 100 : null;
      const depth = depthM !== null ? Math.round(depthM * 100 * 100) / 100 : null;
      const managementFee = toInt(row["管理費"]);
      const permanentUsageFee = toInt(row["永代使用料"]);

      const grave = await prisma.gravePlot.create({
        data: {
          plotNumber,
          area,
          width,
          depth,
          managementFee,
          permanentUsageFee,
          note: str(row["墓地台帳ﾒﾓ"]),
        },
      });
      graveCount++;

      // Create contract if there's a user
      const userId = row["使用者ID"] as number;
      if (userId) {
        const user = userMap.get(userId);
        if (user) {
          const userName = str(user["氏名"]);
          if (userName) {
            const nameKey = userName.replace(/[\s\u3000]+/g, "");
            const matched = nameToHouseholder.get(nameKey);
            if (matched) {
              const plotStart = contractStartDate(plotNumber);
              const created = await prisma.graveContract.create({
                data: {
                  gravePlotId: grave.id,
                  householderId: matched.id,
                  usageStartDate: plotStart,
                  startDate: plotStart,
                  endDate: toDate(row["永代使用期限"]),
                  note: null,
                },
              });
              if (!contractIdByPlotNumber.has(plotNumber)) {
                contractIdByPlotNumber.set(plotNumber, created.id);
              }
              contractCount++;
            } else {
              errorList.push(
                `墓地番号=${plotNumber}: 使用者「${userName}」に一致する戸主が見つかりません`
              );
            }
          }
        }
      }
    } catch (e) {
      errorList.push(
        `墓地台帳ID=${row["墓地台帳ID"]}: ${(e as Error).message}`
      );
    }
  }

  const historyDedupe = new Set<string>();
  async function importHistoryRows(rows: Record<string, unknown>[]) {
    for (const row of rows) {
      const start = toDate(row["使用開始日"]);
      if (!start) continue;

      let plotNumber = str(row["墓地番号"]);
      if (!plotNumber) {
        const ledgerId = row["墓地台帳ID"] as number | undefined;
        if (ledgerId != null) {
          plotNumber = plotNumberByLedgerId.get(ledgerId) ?? null;
        }
      }
      if (!plotNumber) continue;

      const graveContractId = contractIdByPlotNumber.get(plotNumber);
      if (!graveContractId) continue;

      const holderName = str(row["使用者名"]) ?? str(row["氏名"]);
      if (!holderName) continue;

      const end = toDate(row["使用終了日"]);
      const key = `${graveContractId}|${start.getTime()}|${end?.getTime() ?? "x"}|${holderName}`;
      if (historyDedupe.has(key)) continue;
      historyDedupe.add(key);

      await prisma.graveContractHistory.create({
        data: {
          graveContractId,
          householderName: holderName,
          householderKana: str(row["フリガナ"]) ?? str(row["ﾌﾘｶﾞﾅ"]) ?? null,
          startDate: start,
          endDate: end,
          transferredAt: end ?? new Date(),
          note: str(row["備考"]) ?? str(row["ﾒﾓ"]) ?? null,
        },
      });
      historyImported++;
    }
  }

  for (const tableName of historyTableCandidates) {
    try {
      await importHistoryRows(
        reader.getTable(tableName).getData() as Record<string, unknown>[]
      );
    } catch {
      // ignore
    }
  }

  for (const tableName of tableNames) {
    if (historyTableCandidates.includes(tableName)) continue;
    if (tableName === "BOT020_墓地台帳" || tableName === "BOT040_使用者") continue;
    try {
      const rows = reader.getTable(tableName).getData() as Record<
        string,
        unknown
      >[];
      if (rows.length === 0) continue;
      const sample = rows[0];
      if (!sample || !("使用開始日" in sample)) continue;
      if (!("墓地番号" in sample) && !("墓地台帳ID" in sample)) continue;
      await importHistoryRows(rows);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    graves: graveCount,
    contracts: contractCount,
    histories: historyImported,
    errors: errorList.length,
    errorDetails: errorList.slice(0, 50),
  });
}
