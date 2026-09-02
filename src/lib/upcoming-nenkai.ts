import {
  getNextNenkaiCeremonyDate,
  getUpcomingNenkaiDisplayLabel,
  isDateWithinOneYearFrom,
} from "@/lib/memorial-schedule";

/** 年回法名.docx と同じ期間で次の法要ラベルを返す（なければ null） */
export function getUpcomingNenkaiLabel(deathDate: string | null): string | null {
  if (!deathDate) return null;
  const death = new Date(deathDate);
  if (Number.isNaN(death.getTime())) return null;
  return getUpcomingNenkaiDisplayLabel(death);
}

/** 過去帳タブ一覧用：次の年回が1年以内の場合のみラベルを返す */
export function getUpcomingNenkaiLabelForPastLedgerList(
  deathDate: string | null
): string | null {
  if (!deathDate) return null;
  const death = new Date(deathDate);
  if (Number.isNaN(death.getTime())) return null;

  const nextNenkai = getNextNenkaiCeremonyDate(death);
  if (!nextNenkai || !isDateWithinOneYearFrom(nextNenkai)) return null;

  return getUpcomingNenkaiDisplayLabel(death);
}
