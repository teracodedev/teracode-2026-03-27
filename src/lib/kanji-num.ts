// 算用数字→漢数字。年月日・享年などに使用。
// 例: 1 → "一", 10 → "十", 71 → "七十一", 100 → "百", 2026 → "二千二十六"
const DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function numToKanji(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  const i = Math.floor(n);
  if (i === 0) return DIGITS[0];

  if (i < 10) return DIGITS[i];

  if (i < 100) {
    const tens = Math.floor(i / 10);
    const ones = i % 10;
    const tensPart = tens === 1 ? "十" : DIGITS[tens] + "十";
    return tensPart + (ones ? DIGITS[ones] : "");
  }

  if (i < 1000) {
    const hundreds = Math.floor(i / 100);
    const rest = i % 100;
    const hPart = hundreds === 1 ? "百" : DIGITS[hundreds] + "百";
    return hPart + (rest ? numToKanji(rest) : "");
  }

  if (i < 10000) {
    const thousands = Math.floor(i / 1000);
    const rest = i % 1000;
    const tPart = thousands === 1 ? "千" : DIGITS[thousands] + "千";
    return tPart + (rest ? numToKanji(rest) : "");
  }

  // 10000 以上は桁数的に使用想定なし
  return String(i);
}

// 西暦 → 和暦(令和)文字列。令和元年=2019。
export function yearToWareki(y: number): string {
  if (y >= 2019) {
    const n = y - 2018;
    const label = n === 1 ? "元" : numToKanji(n);
    return "令和" + label + "年";
  }
  if (y >= 1989) {
    const n = y - 1988;
    const label = n === 1 ? "元" : numToKanji(n);
    return "平成" + label + "年";
  }
  if (y >= 1926) {
    const n = y - 1925;
    const label = n === 1 ? "元" : numToKanji(n);
    return "昭和" + label + "年";
  }
  return String(y) + "年";
}

// 西暦の日付(ISO 文字列)→ 和暦日付文字列（例: "令和二年七月四日"）
export function isoDateToWareki(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = yearToWareki(d.getFullYear());
  const m = numToKanji(d.getMonth() + 1) + "月";
  const day = numToKanji(d.getDate()) + "日";
  return y + m + day;
}
