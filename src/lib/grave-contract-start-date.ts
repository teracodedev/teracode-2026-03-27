/**
 * 墓地契約の「区画の契約開始日」は、現契約の startDate と履歴各行の startDate のうち最も早い日付とする。
 * 旧仕様の戸主譲渡で startDate が譲渡日に上書きされたレコードは、履歴に残った本来の開始日で補正できる。
 */
export function earliestGraveContractStartDate(
  contractStart: Date | null,
  histories: { startDate: Date | null }[]
): Date | null {
  const dates: Date[] = [];
  if (contractStart) dates.push(contractStart);
  for (const h of histories) {
    if (h.startDate) dates.push(h.startDate);
  }
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}
