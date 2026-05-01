import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { toFullWidthKatakana } from "@/lib/yaml-utils";
import MDBReader from "mdb-reader";

export const runtime = "nodejs";

// 氏名を姓と名に分割（全角スペースまたは半角スペースで区切る）
function splitName(fullName: unknown): [string, string] {
  if (!fullName || typeof fullName !== "string") return ["", ""];
  const trimmed = fullName.trim();
  const idx = trimmed.search(/[\u3000 \u0020]/);
  if (idx >= 0) {
    return [trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim()];
  }
  return [trimmed, ""];
}

// 性別変換（"男"→"M", "女"→"F"）
function toGender(g: unknown): string | null {
  if (g === "男") return "M";
  if (g === "女") return "F";
  return null;
}

// 日付変換
function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const dt = new Date(d as string);
  return isNaN(dt.getTime()) ? null : dt;
}

// null/空文字列を null に変換
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function normalizeAgeAtDeath(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/[才歳]/g, "");
  if (!s) return null;
  // 漢数字を算用数字に変換
  const directMatch = s.match(/^(\d+)$/);
  if (directMatch) {
    const n = Number(directMatch[1]);
    return (Number.isFinite(n) && n > 0 && n < 1000) ? String(n) : null;
  }
  const map: Record<string, number> = { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9 };
  let n = 0; let cur = 0;
  for (const c of s) {
    if (map[c] !== undefined) { cur = map[c]; continue; }
    if (c === "百") { n += (cur || 1) * 100; cur = 0; }
    else if (c === "十") { n += (cur || 1) * 10; cur = 0; }
  }
  n += cur;
  return (n > 0 && n < 1000) ? String(n) : null;
}

// birthDate と deathDate から享年を計算するフォールバック
function calcAgeAtDeathFromDates(birthDate: Date | null, deathDate: Date | null): string | null {
  if (!birthDate || !deathDate) return null;
  let age = deathDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = deathDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && deathDate.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age <= 0 || age >= 200) return null;
  return String(age);
}

function pickAgeAtDeath(row: Record<string, unknown>): string | null {
  const directKeys = ["享年", "行年", "年齢", "享年歳", "享年才"];
  for (const key of directKeys) {
    if (key in row) {
      const age = normalizeAgeAtDeath(row[key]);
      if (age) return age;
    }
  }

  for (const key of Object.keys(row)) {
    if (!/(享年|行年|年齢)/.test(key)) continue;
    const age = normalizeAgeAtDeath(row[key]);
    if (age) return age;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let reader: MDBReader;
  try {
    reader = new MDBReader(buffer);
  } catch {
    return NextResponse.json({ error: "MDBファイルの読み込みに失敗しました" }, { status: 400 });
  }

  // テーブル名を確認
  const tableNames = reader.getTableNames();
  const hasHouseholder = tableNames.includes("UTB001_戸主");
  const hasFamily = tableNames.includes("UTB002_家族");
  if (!hasHouseholder) {
    return NextResponse.json({ error: "UTB001_戸主 テーブルが見つかりません。対応していないMDBファイルです。" }, { status: 400 });
  }

  // 分類マスタを読み込む（MTB011_分類 → 分類ID:分類名）
  const bunruiMap = new Map<number, string>();
  if (tableNames.includes("MTB011_分類")) {
    const bunruiRows = reader.getTable("MTB011_分類").getData();
    for (const row of bunruiRows) {
      const id = row["分類ID"] as number;
      const name = row["分類名"] as string;
      if (id != null && name) {
        bunruiMap.set(id, name);
      }
    }
  }

  // 戸主テーブルを読み込む
  const householderTable = reader.getTable("UTB001_戸主");
  const householderRows = householderTable.getData();
  const householderColumns = householderTable.getColumnNames();
  // 家族テーブルを読み込む（存在する場合）
  const familyTable = hasFamily ? reader.getTable("UTB002_家族") : null;
  const familyRows = familyTable ? familyTable.getData() : [];
  const familyColumns = familyTable ? familyTable.getColumnNames() : [];

  // 「案内不要」に対応する列名を検索（戸主・家族それぞれ）
  const findAnnaiFuyoColumn = (columns: string[]): string | null =>
    columns.find(c => c === "案内不要" || c === "案内不用" || c.includes("案内")) ?? null;
  const householderAnnaiFuyoCol = findAnnaiFuyoColumn(householderColumns);
  const familyAnnaiFuyoCol = findAnnaiFuyoColumn(familyColumns);
  // 家族住所テーブルを読み込む（存在する場合）
  const hasAddress = tableNames.includes("UTB003_家族住所");
  const addressRows = hasAddress ? reader.getTable("UTB003_家族住所").getData() : [];

  // 家族住所を家族IDでインデックス化（家族ID → 住所行）
  const addressByFamilyId = new Map<number, Record<string, unknown>>();
  for (const addr of addressRows) {
    const fid = addr["家族ID"] as number;
    if (fid && !addressByFamilyId.has(fid)) {
      addressByFamilyId.set(fid, addr);
    }
  }

  // ───── 既存データをクリア（外部キー制約の順序で削除） ─────
  await prisma.householderMember.deleteMany();
  await prisma.householder.deleteMany();
  await prisma.familyRegister.deleteMany();

  // 台帳ID（MDB整数） → 新しい Householder UUID のマップ
  const idMap = new Map<number, string>();

  let householderCount = 0;
  let memberCount = 0;
  const errorList: string[] = [];

  // ───── 戸主をインポート ─────
  for (const row of householderRows) {
    try {
      const daichodId = row["台帳ID"] as number;
      const [familyName, givenName] = splitName(row["氏名"]);
      const [familyNameKanaRaw, givenNameKanaRaw] = splitName(row["ﾌﾘｶﾞﾅ"]);
      const birthDate = toDate(row["生年月日"]);
      const deathDate = toDate(row["命日"]);
      const ageAtDeath = pickAgeAtDeath(row) ?? calcAgeAtDeathFromDates(birthDate, deathDate);

      // 分類01〜10 → Tag / HouseholderTag（0以外の値を詰めて格納）
      const tags: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const col = `分類${String(i).padStart(2, "0")}`;
        const id = row[col] as number | null;
        if (id && id !== 0) {
          const name = bunruiMap.get(id);
          if (name) tags.push(name);
        }
      }
      const uniqueTagNames = [...new Set(tags)];

      const householder = await prisma.householder.create({
        data: {
          familyName: familyName || "（不明）",
          givenName: givenName ?? "",
          familyNameKana: toFullWidthKatakana(familyNameKanaRaw),
          givenNameKana: toFullWidthKatakana(givenNameKanaRaw),
          postalCode: str(row["〒"]),
          address1: str(row["住所1"]),
          address2: str(row["住所2"]),
          address3: str(row["住所3"]),
          phone1: str(row["電話"]),
          phone2: str(row["携帯"]),
          fax: str(row["ＦＡＸ"]),
          email: str(row["Email"]),
          gender: toGender(row["性別"]),
          birthDate,
          deathDate,
          ageAtDeath,
          dharmaName: str(row["戒名"]),
          dharmaNameKana: toFullWidthKatakana(str(row["戒名ｶﾅ"])),
          note: str(row["備考"]),
          domicile: str(row["本籍"]),
          joinedAt: toDate(row["新規登録日"]),
          ...(uniqueTagNames.length > 0
            ? {
                tags: {
                  create: uniqueTagNames.map((name) => ({
                    tag: {
                      connectOrCreate: {
                        where: { name },
                        create: { name },
                      },
                    },
                  })),
                },
              }
            : {}),
        },
      });

      // 家族・親族台帳を自動作成して紐付け
      const familyNameKana = toFullWidthKatakana(familyNameKanaRaw) || "";
      const givenNameKana = toFullWidthKatakana(givenNameKanaRaw) || "";
      const kanaPrefix = `${familyNameKana}${givenNameKana}`;
      const registerNameKana = kanaPrefix ? `${kanaPrefix}ノカゾク・シンゾク` : null;
      const familyRegister = await prisma.familyRegister.create({
        data: {
          name: `${familyName}${givenName}の家族・親族台帳`,
          nameKana: registerNameKana || null,
        },
      });
      await prisma.householder.update({
        where: { id: householder.id },
        data: { familyRegisterId: familyRegister.id },
      });

      idMap.set(daichodId, householder.id);
      householderCount++;
    } catch (e) {
      errorList.push(`戸主 台帳ID=${row["台帳ID"]}: ${(e as Error).message}`);
    }
  }

  // ───── 家族員をインポート ─────
  for (const row of familyRows) {
    try {
      const daichodId = row["台帳ID"] as number;
      const householderId = idMap.get(daichodId);
      if (!householderId) {
        errorList.push(`家族 台帳ID=${daichodId}: 対応する戸主が見つかりません（スキップ）`);
        continue;
      }

      const [familyName, givenName] = splitName(row["氏名"]);
      const [familyNameKanaRaw, givenNameKanaRaw] = splitName(row["ﾌﾘｶﾞﾅ"]);

      // UTB003_家族住所 から住所データを取得
      const familyId = row["家族ID"] as number;
      const addr = familyId ? addressByFamilyId.get(familyId) : undefined;
      const memberBirthDate = toDate(row["生年月日"]);
      const memberDeathDate = toDate(row["命日"]);
      const ageAtDeath = pickAgeAtDeath(row) ?? calcAgeAtDeathFromDates(memberBirthDate, memberDeathDate);

      await prisma.householderMember.create({
        data: {
          householderId,
          familyName: familyName || "（不明）",
          givenName: givenName || null,
          familyNameKana: toFullWidthKatakana(familyNameKanaRaw),
          givenNameKana: toFullWidthKatakana(givenNameKanaRaw),
          gender: toGender(row["性別"]),
          birthDate: memberBirthDate,
          deathDate: memberDeathDate,
          ageAtDeath,
          dharmaName: str(row["戒名"]),
          dharmaNameKana: toFullWidthKatakana(str(row["戒名ｶﾅ"])),
          relation: str(row["続柄"]),
          note: str(row["個人備考"]),
          domicile: str(row["本籍"]),
          annaiFuyo: familyAnnaiFuyoCol ? (row[familyAnnaiFuyoCol] === true || row[familyAnnaiFuyoCol] === 1 || row[familyAnnaiFuyoCol] === "1" || row[familyAnnaiFuyoCol] === -1) : false,
          // UTB003_家族住所 のデータがあれば住所・電話を設定
          postalCode: addr ? str(addr["〒"]) : null,
          address1: addr ? str(addr["住所1"]) : null,
          address2: addr ? str(addr["住所2"]) : null,
          address3: addr ? str(addr["住所3"]) : null,
          phone1: addr ? str(addr["電話"]) : null,
          fax: addr ? str(addr["ＦＡＸ"]) : null,
          phone2: addr ? str(addr["携帯"]) : null,
        },
      });
      memberCount++;
    } catch (e) {
      errorList.push(`家族 台帳ID=${row["台帳ID"]} 行=${row["行番号"]}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    householders: householderCount,
    members: memberCount,
    errors: errorList.length,
    errorDetails: errorList.slice(0, 50),
    debug: {
      householderAnnaiFuyoCol,
      familyAnnaiFuyoCol,
      familyColumns,
      householderColumns,
    },
  });
}
