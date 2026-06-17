/** 電話番号から数字のみ抽出 */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** 携帯電話番号かどうか（060/070/080/090） */
export function isMobilePhoneNumber(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return false;
  const digits = digitsOnly(phone);
  if (!digits) return false;

  if (digits.startsWith("81") && digits.length >= 12) {
    return /^(070|080|090|060)/.test(digits.slice(2));
  }

  return /^(070|080|090|060)/.test(digits);
}

/** 戸主交代時の電話番号1を決定（世帯員に未設定かつ旧戸主が固定電話の場合は引き継ぐ） */
export function resolveTransferPhone1(
  memberPhone1: string | null | undefined,
  oldHouseholderPhone1: string | null | undefined,
): string | null {
  if (memberPhone1?.trim()) return memberPhone1.trim();
  const oldPhone1 = oldHouseholderPhone1?.trim();
  if (oldPhone1 && !isMobilePhoneNumber(oldPhone1)) return oldPhone1;
  return null;
}

/** 戸主交代時に旧戸主の電話番号1を引き継ぐか */
export function willInheritTransferPhone1(
  memberPhone1: string | null | undefined,
  oldHouseholderPhone1: string | null | undefined,
): boolean {
  return (
    !memberPhone1?.trim() &&
    Boolean(oldHouseholderPhone1?.trim()) &&
    !isMobilePhoneNumber(oldHouseholderPhone1)
  );
}
