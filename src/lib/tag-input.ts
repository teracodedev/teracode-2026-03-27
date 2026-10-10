export const MAX_TAG_NAME_LENGTH = 100;

/** タグ色は #RRGGBB のみ受け付ける（TagBadge が末尾に透過度の 16 進数を連結して使うため） */
export function isTagColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
