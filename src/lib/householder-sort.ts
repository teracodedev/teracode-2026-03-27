import { toFullWidthKatakana } from "./kana-normalize";

/** 戸主の五十音順ソート用（姓フリガナ→名フリガナ、未登録時は氏名漢字で比較） */
export type HouseholderSortInput = {
  familyNameKana: string | null;
  givenNameKana: string | null;
  familyName: string;
  givenName: string;
};

const collator = new Intl.Collator("ja", { sensitivity: "variant" });

export function householderGojuonSortKey(h: HouseholderSortInput): string {
  const fk = toFullWidthKatakana(h.familyNameKana) ?? "";
  const gk = toFullWidthKatakana(h.givenNameKana) ?? "";
  const kana = (fk + gk).trim();
  if (kana) return kana;
  return `${h.familyName ?? ""}${h.givenName ?? ""}`.trim();
}

export function compareHouseholderGojuon(a: HouseholderSortInput, b: HouseholderSortInput): number {
  return collator.compare(householderGojuonSortKey(a), householderGojuonSortKey(b));
}
