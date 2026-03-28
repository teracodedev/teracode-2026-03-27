import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";
import { getMemberDelegate, getHouseholderFieldMap, getHouseholderModelKind } from "@/lib/prisma-models";
import {
  fillDocxTemplate,
  toWareki,
  addDays,
  addYears,
  calcAgeAtDeath,
  getNextMemorialLabel,
  getNenkaiLabel,
  toFullWidthHiragana,
  CHUIN_SCHEDULE,
  NENKAI_SCHEDULE,
} from "@/lib/docx-template";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; type: string }> };

// Map document type → template filename
const TEMPLATE_MAP: Record<string, string> = {
  sogi: "葬儀法名テンプレート.docx",
  "sogi-ingo": "葬儀院号法名テンプレート.docx",
  chuin: "中陰表法名テンプレート.docx",
  "chuin-ingo": "中陰表院号法名テンプレート.docx",
  nenkai: "年回法名テンプレート.docx",
  "nenkai-ingo": "年回院号法名テンプレート.docx",
  noukansoungou: "納棺尊号.docx",
};

export async function GET(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id, type } = await params;

  const templateFile = TEMPLATE_MAP[type];
  if (!templateFile) {
    return NextResponse.json({ error: "無効なドキュメント種別です" }, { status: 400 });
  }

  const templatePath = path.join(process.cwd(), "templates", templateFile);
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 500 });
  }

  try {
    // Static file (no variable substitution)
    if (type === "noukansoungou") {
      const buffer = fs.readFileSync(templatePath);
      return new NextResponse(new Uint8Array(buffer), {
        headers: buildHeaders(templateFile),
      });
    }

    // Fetch member data
    const kind = getHouseholderModelKind();
    const memberDelegate = getMemberDelegate() as {
      findUnique: (args: unknown) => Promise<unknown>;
    };
    const fields = getHouseholderFieldMap(kind);

    const member = (await memberDelegate.findUnique({
      where: { id },
      include: { [fields.relation]: true },
    })) as MemberWithHouseholder | null;

    if (!member) {
      return NextResponse.json({ error: "記録が見つかりません" }, { status: 404 });
    }
    if (!member.deathDate) {
      return NextResponse.json({ error: "命日が登録されていません" }, { status: 400 });
    }

    const vars = buildVars(member, type);
    const buffer = await fillDocxTemplate(templatePath, vars);

    const downloadName = buildFilename(member, type, vars["年回"]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: buildHeaders(downloadName),
    });
  } catch (error) {
    console.error(`GET /api/members/${id}/document/${type} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message || "エラーが発生しました" },
      { status: 500 }
    );
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface MemberWithHouseholder {
  id: string;
  familyName: string;
  givenName: string | null;
  familyNameKana: string | null;
  givenNameKana: string | null;
  dharmaName: string | null;
  dharmaNameKana: string | null;
  deathDate: Date | null;
  birthDate: Date | null;
  ageAtDeath: string | null;
  householder?: HouseholderData;
  danka?: HouseholderData;
}

interface HouseholderData {
  familyName: string;
  givenName: string;
}

// ── Variable builders ──────────────────────────────────────────────────────

function buildVars(
  member: MemberWithHouseholder,
  type: string
): Record<string, string> {
  const deathDate = new Date(member.deathDate!);
  const birthDate = member.birthDate ? new Date(member.birthDate) : null;
  const ageAtDeath = toKanjiAgeString(calcAgeAtDeath(birthDate, deathDate) || member.ageAtDeath) || "不詳";

  const vars: Record<string, string> = {
    命日: toWareki(deathDate) + "往生",
    法名: member.dharmaName ?? "",
    法名ふりがな: toFullWidthHiragana(member.dharmaNameKana),
    姓: member.familyName,
    名: member.givenName ?? "",
    姓ふりがな: toFullWidthHiragana(member.familyNameKana),
    名ふりがな: toFullWidthHiragana(member.givenNameKana),
    享年: ageAtDeath,
    行年: ageAtDeath,
    年齢: ageAtDeath,
    享年才: ageAtDeath,
    享年歳: ageAtDeath,
    年回: (type === "nenkai" || type === "nenkai-ingo") ? getNenkaiLabel(deathDate) : getNextMemorialLabel(deathDate),
  };

  // 中陰表 / 年回表 date placeholders
  if (type === "chuin" || type === "chuin-ingo") {
    for (const { key, days } of CHUIN_SCHEDULE) {
      vars[key] = toWareki(addDays(deathDate, days));
    }
    for (const { key, years } of NENKAI_SCHEDULE) {
      vars[key] = toWareki(addYears(deathDate, years));
    }
  }

  return vars;
}

function toKanjiAgeString(value: string | null | undefined): string {
  if (!value) return "";
  const s = value.trim().replace(/才$/, "歳");
  if (!s) return "";
  const match = s.match(/^(\d+)\s*歳$/);
  if (!match) return s;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0 || n >= 1000) return s;

  const digits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  let kanji = "";
  if (hundreds > 0) kanji += (hundreds === 1 ? "" : digits[hundreds]) + "百";
  if (tens > 0) kanji += (tens === 1 ? "" : digits[tens]) + "十";
  if (ones > 0) kanji += digits[ones];
  return `${kanji}歳`;
}

function buildFilename(member: MemberWithHouseholder, type: string, memorialLabel?: string): string {
  const name = member.familyName + (member.givenName ? member.givenName : "");
  if ((type === "nenkai" || type === "nenkai-ingo") && memorialLabel) {
    return `${name}の${memorialLabel}.docx`;
  }
  const labelMap: Record<string, string> = {
    sogi: "葬儀法名",
    "sogi-ingo": "葬儀院号法名",
    chuin: "中陰表・年回表",
    "chuin-ingo": "中陰表院号・年回表",
    nenkai: "年回法名",
    "nenkai-ingo": "年回院号法名",
  };
  return `${name}の${labelMap[type] ?? type}.docx`;
}

function buildHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  };
}
