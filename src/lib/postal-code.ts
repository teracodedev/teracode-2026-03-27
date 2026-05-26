/** 郵便番号を 123-4567 形式に整形 */
export function formatPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.length > 3 ? digits.slice(0, 3) + "-" + digits.slice(3) : digits;
}

/** 7桁の郵便番号から住所1（都道府県・市区町村・町域）を取得 */
export async function lookupPostalCode(zip: string): Promise<string | null> {
  const code = zip.replace(/-/g, "");
  if (code.length !== 7 || !/^\d{7}$/.test(code)) return null;
  try {
    const res = await fetch(`/api/postal-lookup?zipcode=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string | null };
    return data.address?.trim() || null;
  } catch {
    return null;
  }
}
