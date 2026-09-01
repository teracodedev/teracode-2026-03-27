export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// 中陰表（命日を1日目として数える）
export const CHUIN_SCHEDULE = [
  { key: "初七日忌", days: 6 },
  { key: "二七日忌", days: 13 },
  { key: "三七日忌", days: 20 },
  { key: "四七日忌", days: 27 },
  { key: "五七日忌", days: 34 },
  { key: "六七日忌", days: 41 },
  { key: "四十九日忌", days: 48 },
];

/** 年回法名・過去帳表示：葬儀期間（初七日）終了後〜死後60日目まで「四十九日忌」（命日を1日目） */
export const NENKAI_SHIJUKU_DISPLAY_UNTIL_DAYS = 59;

// 年回表
export const NENKAI_SCHEDULE = [
  { key: "一周忌", years: 1 },
  { key: "三回忌", years: 2 },
  { key: "七回忌", years: 6 },
  { key: "十三回忌", years: 12 },
  { key: "十七回忌", years: 16 },
  { key: "二十五回忌", years: 24 },
  { key: "三十三回忌", years: 32 },
  { key: "五十回忌", years: 49 },
];

function todayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** 一周忌は当日を過ぎても1ヶ月間、それ以外は1年間は同じ年回を表示 */
function nenkaiGraceEnd(memorialDate: Date, key: string): Date {
  const grace = new Date(memorialDate);
  if (key === "一周忌") grace.setMonth(grace.getMonth() + 1);
  else grace.setFullYear(grace.getFullYear() + 1);
  grace.setHours(0, 0, 0, 0);
  return grace;
}

export function memorialDateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveUpcomingMemorial(
  deathDate: Date,
  today: Date
): { label: string; date: Date } | null {
  const day7 = addDays(deathDate, 6);
  day7.setHours(0, 0, 0, 0);
  if (day7 >= today) return { label: "葬儀", date: day7 };

  const shijukuDisplayEnd = addDays(deathDate, NENKAI_SHIJUKU_DISPLAY_UNTIL_DAYS);
  shijukuDisplayEnd.setHours(0, 0, 0, 0);
  if (shijukuDisplayEnd >= today) {
    const shijukuDate = addDays(deathDate, 48);
    shijukuDate.setHours(0, 0, 0, 0);
    return { label: "四十九日忌", date: shijukuDate };
  }

  for (const { key, years } of NENKAI_SCHEDULE) {
    const d = addYears(deathDate, years);
    d.setHours(0, 0, 0, 0);
    if (d >= today) return { label: key, date: d };
    if (today < nenkaiGraceEnd(d, key)) return { label: key, date: d };
  }
  return null;
}

/** 年回法名・過去帳用：次の法要ラベル（該当なしは null） */
export function getUpcomingNenkaiDisplayLabel(deathDate: Date): string | null {
  return resolveUpcomingMemorial(deathDate, todayStart())?.label ?? null;
}

/** 過去帳詳細用：次の法要ラベルと法要日（該当なしは null） */
export function getUpcomingMemorialDisplay(
  deathDate: Date
): { label: string; date: Date } | null {
  return resolveUpcomingMemorial(deathDate, todayStart());
}

/** 年回法名用ラベル：葬儀 → 四十九日忌（死後60日まで） → 一周忌 → 三回忌 … の順 */
export function getNenkaiLabel(deathDate: Date): string {
  return resolveUpcomingMemorial(deathDate, todayStart())?.label ?? "五十回忌";
}

/** 直近の仏事ラベルを返す（中陰 → 年回の順） */
export function getNextMemorialLabel(deathDate: Date): string {
  const today = todayStart();

  for (const { key, days } of CHUIN_SCHEDULE) {
    const d = addDays(deathDate, days);
    d.setHours(0, 0, 0, 0);
    if (d >= today) return key;
  }
  for (const { key, years } of NENKAI_SCHEDULE) {
    const d = addYears(deathDate, years);
    d.setHours(0, 0, 0, 0);
    if (d >= today) return key;
    if (today < nenkaiGraceEnd(d, key)) return key;
  }
  return "五十回忌";
}
