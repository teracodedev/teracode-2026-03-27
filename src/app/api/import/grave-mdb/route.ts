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
  for (const row of graveRows) {
    const plotNumber = str(row["墓地番号"]);
    if (!plotNumber) continue;

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
  const errorList: string[] = [];

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
                await prisma.graveContract.create({
                  data: {
                    gravePlotId: existing.id,
                    householderId: matched.id,
                    startDate: contractStartDate(plotNumber),
                    endDate: toDate(row["永代使用期限"]),
                    note: str(row["墓地台帳ﾒﾓ"]),
                  },
                });
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
              await prisma.graveContract.create({
                data: {
                  gravePlotId: grave.id,
                  householderId: matched.id,
                  startDate: contractStartDate(plotNumber),
                  endDate: toDate(row["永代使用期限"]),
                  note: null,
                },
              });
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

  return NextResponse.json({
    graves: graveCount,
    contracts: contractCount,
    errors: errorList.length,
    errorDetails: errorList.slice(0, 50),
  });
}
