/** 性別コード（DB保存値）。不明は null */
export type GenderCode = "M" | "F" | "O";

export const GENDER_SELECT_OPTIONS = [
  { value: "M", label: "男性" },
  { value: "F", label: "女性" },
  { value: "O", label: "その他" },
  { value: "", label: "不明" },
] as const;

/** DB値 → フォームの select value（不明は空文字） */
export function genderFromDb(g: string | null | undefined): string {
  if (g === "M" || g === "F" || g === "O") return g;
  if (g && g !== "U") return "O";
  return "";
}

/** フォーム値 → DB保存値（不明は null） */
export function genderToDb(g: string | null | undefined): string | null {
  if (g === "M" || g === "F" || g === "O") return g;
  return null;
}

/** 表示用ラベル */
export function formatGenderLabel(g: string | null | undefined): string {
  if (g === "M") return "男性";
  if (g === "F") return "女性";
  if (g === "O" || (g && g !== "U")) return "その他";
  return "不明";
}
