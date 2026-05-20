/** date input 用。無効な日付文字列では例外を出さず空文字を返す */
export function safeToDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}
