/** MDB 戸主テーブルの「住所履歴」テキストを構造化データへ変換する */

const ERA_START: Record<string, number> = {
  令和: 2019,
  平成: 1989,
  昭和: 1926,
  大正: 1912,
  明治: 1868,
};

export type ParsedAddressHistory = {
  postalCode: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  movedAt: Date | null;
  note: string | null;
};

function parseWarekiDate(text: string): Date | null {
  const m = text.match(/(令和|平成|昭和|大正|明治)(元|\d+)年(\d+)月(\d+)日/);
  if (!m) return null;
  const year = m[2] === "元" ? 1 : Number(m[2]);
  const west = ERA_START[m[1]] + year - 1;
  const d = new Date(Date.UTC(west, Number(m[3]) - 1, Number(m[4])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizePostalCode(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return raw;
}

function isPostalCodeLine(line: string): boolean {
  return /^\d{3}-?\d{4}$/.test(line);
}

function isPhoneOrFaxLine(line: string): boolean {
  return /^(電話|FAX|ＦＡＸ)/.test(line);
}

/**
 * J2善法寺などの「住所履歴」メモ欄をパースする。
 *
 * 例:
 * <<住所履歴2>> 令和3年5月16日 変更
 *       青井　マツ子
 *       731-5136
 *       広島県広島市佐伯区楽々園
 *       ５－２－１６
 *       楽々園豊栄ハイツ５０４
 *       電話 082-923-4312
 */
export function parseMdbAddressHistoryText(text: unknown): ParsedAddressHistory[] {
  if (!text || typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const blocks = trimmed
    .split(/<<住所履歴\d+>>/)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: ParsedAddressHistory[] = [];

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s+/, "").trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    let i = 0;
    let movedAt: Date | null = null;
    if (/(令和|平成|昭和|大正|明治)(元|\d+)年\d+月\d+日/.test(lines[0])) {
      movedAt = parseWarekiDate(lines[0]);
      i = 1;
    }

    let name: string | null = null;
    if (
      i < lines.length &&
      !isPostalCodeLine(lines[i]) &&
      !isPhoneOrFaxLine(lines[i])
    ) {
      name = lines[i++];
    }

    let postalCode: string | null = null;
    let address1: string | null = null;
    let address2: string | null = null;
    const address3Parts: string[] = [];
    const phoneParts: string[] = [];

    if (i < lines.length && isPostalCodeLine(lines[i])) {
      postalCode = normalizePostalCode(lines[i++]);
    }
    if (i < lines.length && !isPhoneOrFaxLine(lines[i])) {
      address1 = lines[i++];
    }
    if (i < lines.length && !isPhoneOrFaxLine(lines[i])) {
      address2 = lines[i++];
    }
    while (i < lines.length) {
      const line = lines[i++];
      if (isPhoneOrFaxLine(line)) phoneParts.push(line);
      else address3Parts.push(line);
    }

    const address3 = address3Parts.length > 0 ? address3Parts.join(" ") : null;
    const noteParts: string[] = [];
    if (name) noteParts.push(`氏名: ${name}`);
    noteParts.push(...phoneParts);

    if (!postalCode && !address1 && !address2 && !address3) continue;

    results.push({
      postalCode,
      address1,
      address2,
      address3,
      movedAt,
      note: noteParts.length > 0 ? noteParts.join(" / ") : null,
    });
  }

  return results;
}
