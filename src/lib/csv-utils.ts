/**
 * CSV / Excel / 筆まめ 生成・ダウンロードユーティリティ
 */
import * as XLSX from "xlsx";

// ─── CSV ───────────────────────────────────────────────

function escapeCsvValue(value: string): string {
  // "1-2-3" や "1/2" など、Excelが日付として解釈しうるパターンは
  // ="値" 形式でラップしてテキスト扱いにする
  if (/^\d+[-\/]\d+([-\/]\d+)?$/.test(value.trim())) {
    return `="${value.replace(/"/g, '""')}"`;
  }
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    row.map((cell) => escapeCsvValue(cell ?? "")).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

// ─── Excel (.xlsx) ─────────────────────────────────────

export function downloadExcel(
  headers: string[],
  rows: string[][],
  filename: string,
  sheetName = "データ"
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 全セルを文字列型に固定して Excelの自動変換を防ぐ
  Object.keys(ws).forEach((key) => {
    if (key.startsWith("!")) return;
    const cell = ws[key];
    if (cell.t !== "s") {
      cell.t = "s";
      cell.v = String(cell.v ?? "");
    }
  });

  // 列幅を内容に合わせて調整
  ws["!cols"] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => (r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const wbout: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

// ─── vCard (.vcf) ──────────────────────────────────────

/**
 * vCard 3.0 形式でダウンロード（筆まめ・スマートフォン等でインポート可能）
 */
export function downloadVcf(rows: VcfRow[], filename: string): void {
  const cards = rows.map((r) => buildVcard(r));
  const blob = new Blob([cards.join("\r\n")], { type: "text/vcard;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function buildVcard(r: VcfRow): string {
  const fullName = [r.familyName, r.givenName].filter(Boolean).join(" ");
  const fullKana = [r.familyNameKana, r.givenNameKana].filter(Boolean).join(" ");
  const address = [r.address1, r.address2, r.address3].filter(Boolean).join("");

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    // 氏名（姓;名 形式）
    `N:${vcfEscape(r.familyName)};${vcfEscape(r.givenName)};;;`,
    `FN:${vcfEscape(fullName)}`,
    // フリガナ（各社アプリが参照するフィールド）
    ...(fullKana
      ? [
          `X-PHONETIC-LAST-NAME:${vcfEscape(r.familyNameKana)}`,
          `X-PHONETIC-FIRST-NAME:${vcfEscape(r.givenNameKana)}`,
          `SORT-STRING:${vcfEscape(fullKana)}`,
        ]
      : []),
    // 住所
    ...(address
      ? [`ADR;TYPE=HOME:;;${vcfEscape(address)};;;;;`]
      : []),
    // 郵便番号（住所の一部として付加）
    ...(r.postalCode ? [`X-ADDR-POSTAL-CODE:${vcfEscape(r.postalCode)}`] : []),
    // 電話番号
    ...(r.tel1 ? [`TEL;TYPE=HOME,VOICE:${vcfEscape(r.tel1)}`] : []),
    ...(r.tel2 ? [`TEL;TYPE=HOME,VOICE:${vcfEscape(r.tel2)}`] : []),
    ...(r.fax  ? [`TEL;TYPE=FAX:${vcfEscape(r.fax)}`] : []),
    // メモ
    ...(r.note ? [`NOTE:${vcfEscape(r.note)}`] : []),
    "END:VCARD",
  ];
  return lines.join("\r\n");
}

function vcfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export interface VcfRow {
  familyName: string;
  givenName: string;
  familyNameKana: string;
  givenNameKana: string;
  postalCode: string;
  address1: string;
  address2: string;
  address3: string;
  tel1: string;
  tel2: string;
  fax: string;
  note?: string;
}

// 後方互換のため残す
export { downloadVcf as downloadFudemame };
export type { VcfRow as FudemameRow };

// ─── 共通ユーティリティ ────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
