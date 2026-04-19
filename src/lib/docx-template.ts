import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import nunjucks from "nunjucks";
import fs from "fs";

// nunjucks 環境（autoescape オフ：docxtemplater 側で XML エスケープを管理）
const njkEnv = new nunjucks.Environment(null, { autoescape: false });

function normalizeTemplateTag(tag: string): string {
  return tag
    // Word の XML 断片が混ざるケースを除去
    .replace(/<[^>]*>/g, "")
    // XML エンティティを簡易デコード
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    // 全角・半角スペースや改行を除去
    .replace(/[\s\u3000]+/g, "")
    .trim();
}

/**
 * .docx テンプレートに変数を埋め込んで返す。
 *
 * テンプレート内の {{ 変数名 }} を nunjucks で評価する。
 * docxtemplater が XML の断片化（複数の <w:t> ノードへの分割）を自動処理し、
 * nunjucks がその式を評価する。
 */
export async function fillDocxTemplate(
  templatePath: string,
  vars: Record<string, string>
): Promise<Buffer> {
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // テンプレートの {{ }} を nunjucks と同じ記法で使用
    delimiters: { start: "{{", end: "}}" },
    // nunjucks をパーサーとして組み込む
    parser: (tag: string) => ({
      get: (scope: Record<string, string>) => {
        try {
          // {{ 変数名 }} をnunjucksで評価
          const rendered = njkEnv.renderString(`{{ ${tag} }}`, scope) ?? "";
          if (rendered !== "") return rendered;

          // Word 内部の run 分割で tag に XML 断片が混ざる場合のフォールバック
          const normalizedTag = normalizeTemplateTag(tag);
          if (normalizedTag && normalizedTag in scope) {
            return scope[normalizedTag] ?? "";
          }
          return "";
        } catch {
          // 例: tag が壊れていて nunjucks が解釈できない場合
          const normalizedTag = normalizeTemplateTag(tag);
          if (normalizedTag && normalizedTag in scope) {
            return scope[normalizedTag] ?? "";
          }
          return "";
        }
      },
    }),
  });

  doc.render(vars);

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return Buffer.from(buffer);
}

// ── 日付ユーティリティ ────────────────────────────────────────────

function toKanji(n: number): string {
  if (n === 0) return "〇";
  const digits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const units = ["", "十", "百", "千"];
  let result = "";
  const str = String(n);
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const d = parseInt(str[i]);
    const unit = units[len - 1 - i];
    if (d === 0) continue;
    if (d === 1 && unit !== "") result += unit;
    else result += digits[d] + unit;
  }
  return result;
}

export function toWareki(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();

  let eraName: string;
  let eraYear: number;

  if (y > 2019 || (y === 2019 && m >= 5)) {
    eraName = "令和";
    eraYear = y - 2018;
  } else if (
    y > 1989 ||
    (y === 1989 && m > 1) ||
    (y === 1989 && m === 1 && day >= 8)
  ) {
    eraName = "平成";
    eraYear = y - 1988;
  } else if (y > 1926 || (y === 1926 && m === 12 && day >= 25)) {
    eraName = "昭和";
    eraYear = y - 1925;
  } else if (y > 1912 || (y === 1912 && m >= 8)) {
    eraName = "大正";
    eraYear = y - 1911;
  } else {
    eraName = "明治";
    eraYear = y - 1867;
  }

  return `${eraName}${toKanji(eraYear)}年${toKanji(m)}月${toKanji(day)}日`;
}

const KANJI_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function toKanjiNumber(n: number): string {
  if (n <= 0) return "";
  let result = "";
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  if (hundreds > 0) result += (hundreds === 1 ? "" : KANJI_DIGITS[hundreds]) + "百";
  if (tens > 0) result += (tens === 1 ? "" : KANJI_DIGITS[tens]) + "十";
  if (ones > 0) result += KANJI_DIGITS[ones];
  return result;
}

export function calcAgeAtDeath(
  birthDate: Date | null,
  deathDate: Date
): string {
  if (!birthDate) return "";
  let age = deathDate.getFullYear() - birthDate.getFullYear();
  const m = deathDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && deathDate.getDate() < birthDate.getDate())) age--;
  return toKanjiNumber(age) + "歳";
}

export function toFullWidthHiragana(s: string | null | undefined): string {
  if (!s) return "";
  return s
    // 半角カタカナ → 全角カタカナ
    .replace(/[\uFF61-\uFF9F]/g, (ch) => {
      const map: Record<string, string> = {
        "ｦ": "ヲ", "ｧ": "ァ", "ｨ": "ィ", "ｩ": "ゥ", "ｪ": "ェ", "ｫ": "ォ",
        "ｬ": "ャ", "ｭ": "ュ", "ｮ": "ョ", "ｯ": "ッ", "ｰ": "ー",
        "ｱ": "ア", "ｲ": "イ", "ｳ": "ウ", "ｴ": "エ", "ｵ": "オ",
        "ｶ": "カ", "ｷ": "キ", "ｸ": "ク", "ｹ": "ケ", "ｺ": "コ",
        "ｻ": "サ", "ｼ": "シ", "ｽ": "ス", "ｾ": "セ", "ｿ": "ソ",
        "ﾀ": "タ", "ﾁ": "チ", "ﾂ": "ツ", "ﾃ": "テ", "ﾄ": "ト",
        "ﾅ": "ナ", "ﾆ": "ニ", "ﾇ": "ヌ", "ﾈ": "ネ", "ﾉ": "ノ",
        "ﾊ": "ハ", "ﾋ": "ヒ", "ﾌ": "フ", "ﾍ": "ヘ", "ﾎ": "ホ",
        "ﾏ": "マ", "ﾐ": "ミ", "ﾑ": "ム", "ﾒ": "メ", "ﾓ": "モ",
        "ﾔ": "ヤ", "ﾕ": "ユ", "ﾖ": "ヨ",
        "ﾗ": "ラ", "ﾘ": "リ", "ﾙ": "ル", "ﾚ": "レ", "ﾛ": "ロ",
        "ﾜ": "ワ", "ﾝ": "ン", "ﾞ": "゛", "ﾟ": "゜",
      };
      return map[ch] ?? ch;
    })
    // 濁点・半濁点の結合
    .replace(/([ウカキクケコサシスセソタチツテトハヒフヘホ])゛/g, (_, b) => {
      const v: Record<string, string> = {
        "ウ": "ヴ", "カ": "ガ", "キ": "ギ", "ク": "グ", "ケ": "ゲ", "コ": "ゴ",
        "サ": "ザ", "シ": "ジ", "ス": "ズ", "セ": "ゼ", "ソ": "ゾ",
        "タ": "ダ", "チ": "ヂ", "ツ": "ヅ", "テ": "デ", "ト": "ド",
        "ハ": "バ", "ヒ": "ビ", "フ": "ブ", "ヘ": "ベ", "ホ": "ボ",
      };
      return v[b] ?? b + "゛";
    })
    .replace(/([ハヒフヘホ])゜/g, (_, b) => {
      const p: Record<string, string> = { "ハ": "パ", "ヒ": "ピ", "フ": "プ", "ヘ": "ペ", "ホ": "ポ" };
      return p[b] ?? b + "゜";
    })
    // 全角カタカナ → ひらがな
    .replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .trim();
}

