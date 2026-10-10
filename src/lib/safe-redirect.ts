const PARSE_BASE = "http://localhost";

/**
 * ログイン後の遷移先を同一オリジン内のパスに限定する（オープンリダイレクト対策）。
 * "/\evil.com" や "/\t/evil.com" はブラウザが別ホストとして解釈するため、
 * 文字列の前方一致ではなく URL として解決した結果で判定する。
 */
export function safeCallbackPath(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.startsWith("/")) return "/";

  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return "/";
  }
  if (url.origin !== PARSE_BASE) return "/";

  const path = `${url.pathname}${url.search}${url.hash}`;
  // "/.//evil.com" はドット区間の除去後に "//evil.com"（プロトコル相対 URL）になる
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}
