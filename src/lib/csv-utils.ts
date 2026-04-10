/**
 * CSV生成・ダウンロードユーティリティ
 */

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
