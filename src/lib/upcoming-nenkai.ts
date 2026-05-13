/** 命日から1年以内に迎える年回のラベルを返す（なければ null） */
const NENKAI_LIST: { label: string; years: number }[] = [
  { label: "一周忌", years: 1 },
  { label: "三回忌", years: 2 },
  { label: "七回忌", years: 6 },
  { label: "十三回忌", years: 12 },
  { label: "十七回忌", years: 16 },
  { label: "二十五回忌", years: 24 },
  { label: "三十三回忌", years: 32 },
  { label: "五十回忌", years: 49 },
];

export function getUpcomingNenkaiLabel(deathDate: string | null): string | null {
  if (!deathDate) return null;
  const death = new Date(deathDate);
  if (Number.isNaN(death.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  for (const nk of NENKAI_LIST) {
    const d = new Date(death);
    d.setFullYear(d.getFullYear() + nk.years);
    d.setHours(0, 0, 0, 0);
    if (d >= today && d <= oneYearLater) {
      return nk.label;
    }
  }
  return null;
}
