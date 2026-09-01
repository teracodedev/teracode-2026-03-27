import { getUpcomingNenkaiDisplayLabel } from "@/lib/memorial-schedule";

/** 年回法名.docx と同じ期間で次の法要ラベルを返す（なければ null） */
export function getUpcomingNenkaiLabel(deathDate: string | null): string | null {
  if (!deathDate) return null;
  const death = new Date(deathDate);
  if (Number.isNaN(death.getTime())) return null;
  return getUpcomingNenkaiDisplayLabel(death);
}
