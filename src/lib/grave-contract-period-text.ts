function formatJpDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 「2019年5月21日から2034年5月20日まで」のように、から／までで区切る。
 */
export function graveContractPeriodKaraMade(startDate: string | null, endDate: string | null): string {
  const s = formatJpDate(startDate);
  const e = formatJpDate(endDate);
  if (s === "-" && e === "-") return "未登録";
  if (s === "-") return `（開始日未登録）から${e}まで`;
  if (e === "-") return `${s}から（終了日未登録）`;
  return `${s}から${e}まで`;
}

/** 文頭に「契約期間が」を付けた表示用 */
export function graveContractPeriodGaSentence(startDate: string | null, endDate: string | null): string {
  const body = graveContractPeriodKaraMade(startDate, endDate);
  if (body === "未登録") return "契約期間が未登録です";
  return `契約期間が${body}`;
}
