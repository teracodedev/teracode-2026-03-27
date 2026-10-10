/**
 * ログイン失敗回数による試行制限（ブルートフォース・パスワードスプレー対策）。
 * PM2 は instances: 1 の単一プロセス運用のため、プロセス内メモリで管理する。
 * 複数プロセス・複数台構成にする場合は Redis などの共有ストアに置き換えること。
 */

const WINDOW_MS = 15 * 60 * 1000;
/** 同一 IP からの失敗上限（寺務所などで IP を共有する利用者がいるため、アカウント単位より緩くする） */
const MAX_FAILURES_PER_IP = 20;
/** 同一アカウントへの失敗上限（IP を分散させた攻撃への対策） */
const MAX_FAILURES_PER_ACCOUNT = 5;
const MAX_ENTRIES = 50_000;

type Entry = { count: number; resetAt: number };

const globalForThrottle = globalThis as unknown as { loginFailures?: Map<string, Entry> };
const failures = (globalForThrottle.loginFailures ??= new Map<string, Entry>());

function accountKey(email: string): string {
  return `account:${email.trim().toLowerCase()}`;
}

function activeCount(key: string, now: number): number {
  const entry = failures.get(key);
  if (!entry) return 0;
  if (entry.resetAt <= now) {
    failures.delete(key);
    return 0;
  }
  return entry.count;
}

function purgeExpired(now: number): void {
  for (const [key, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(key);
  }
  // 大量の異なるキーでメモリを圧迫された場合の最終手段
  if (failures.size >= MAX_ENTRIES) failures.clear();
}

/**
 * nginx が $remote_addr で上書きする X-Real-IP を使う（X-Forwarded-For の先頭はクライアントが偽装できる）。
 * Next.js が 127.0.0.1 で待ち受け、nginx を経由しないリクエストが届かないことが前提。
 */
export function getClientIp(headers: Headers): string {
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function isLoginThrottled(ip: string, email: string): boolean {
  const now = Date.now();
  return (
    activeCount(`ip:${ip}`, now) >= MAX_FAILURES_PER_IP ||
    activeCount(accountKey(email), now) >= MAX_FAILURES_PER_ACCOUNT
  );
}

export function recordLoginFailure(ip: string, email: string): void {
  const now = Date.now();
  if (failures.size >= MAX_ENTRIES) purgeExpired(now);
  for (const key of [`ip:${ip}`, accountKey(email)]) {
    const entry = failures.get(key);
    if (entry && entry.resetAt > now) entry.count += 1;
    else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }
}

/** ログイン成功時はアカウント側のみ解除する（IP 側を解除すると、有効なアカウントを持つ攻撃者が回数をリセットできる） */
export function clearAccountFailures(email: string): void {
  failures.delete(accountKey(email));
}
