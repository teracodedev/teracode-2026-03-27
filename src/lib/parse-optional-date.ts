/** Prisma / PostgreSQL DateTime で安全に保存できる年の範囲 */
export const PRISMA_DATE_YEAR_MIN = 1000;
export const PRISMA_DATE_YEAR_MAX = 9999;

/** DB 書き込み用。不正・範囲外の日付は null にする（既存データのコピー向け） */
export function toPrismaDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < PRISMA_DATE_YEAR_MIN || y > PRISMA_DATE_YEAR_MAX) return null;
  return d;
}

/** API 入力用。空は null、不正ならエラーメッセージ */
export function parseDateFieldForApi(
  value: unknown,
  fieldLabel: string,
): Date | null | { error: string } {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return { error: `${fieldLabel}の形式が正しくありません` };
  }
  const y = d.getUTCFullYear();
  if (y < PRISMA_DATE_YEAR_MIN || y > PRISMA_DATE_YEAR_MAX) {
    return {
      error: `${fieldLabel}の年は${PRISMA_DATE_YEAR_MIN}年から${PRISMA_DATE_YEAR_MAX}年の範囲で入力してください`,
    };
  }
  return d;
}
