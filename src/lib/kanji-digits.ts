/** 算用数字1文字 → 漢数字（〇〜九）。郵便番号・電話・番地表記用 */
const KANJI_DIGIT = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

export function asciiDigitToKanjiDigit(ch: string): string {
  if (ch >= "0" && ch <= "9") return KANJI_DIGIT[ch.charCodeAt(0) - 48];
  if (ch >= "０" && ch <= "９") return KANJI_DIGIT[ch.charCodeAt(0) - 0xff10];
  return ch;
}

/** 文字列中の Western / 全角 数字をすべて漢数字（桁）に置換。ハイフン・長音は維持 */
export function westernNumeralsToKanjiDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    out += asciiDigitToKanjiDigit(ch);
  }
  return out;
}
