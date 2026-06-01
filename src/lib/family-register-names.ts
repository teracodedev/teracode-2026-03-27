import { toFullWidthKatakana } from "./kana-normalize";

const NAME_SUFFIX = "の家族・親族台帳";
const KANA_SUFFIX = "ノカゾク・シンゾクダイチョウ";

/** 戸主名から家族・親族台帳の表示名を生成する */
export function buildFamilyRegisterName(familyName: string, givenName: string): string {
  return `${familyName}${givenName}${NAME_SUFFIX}`;
}

/** 戸主フリガナから家族・親族台帳のフリガナ（全角カタカナ）を生成する */
export function buildFamilyRegisterNameKana(
  familyNameKana?: string | null,
  givenNameKana?: string | null,
): string | null {
  const familyKana = toFullWidthKatakana(familyNameKana) || "";
  const givenKana = toFullWidthKatakana(givenNameKana) || "";
  const prefix = `${familyKana}${givenKana}`;
  if (!prefix) return null;
  return `${prefix}${KANA_SUFFIX}`;
}
