// middleware（Edge Runtime）からも読み込むため、Node 専用モジュールを import しないこと

/** auth.config.ts の Cookie 設定と /api/login の JWT salt で同じ名前を使う（変えると既存セッションが無効になる） */
export const SESSION_COOKIE_NAME = "authjs.session-token";

/** 最後の画面遷移からこの秒数を過ぎると失効する（画面遷移のたびに延長される） */
export const SESSION_IDLE_TIMEOUT_SEC = 8 * 60 * 60;

/** ログインからこの秒数を過ぎると、操作中でも再ログインを求める */
export const SESSION_ABSOLUTE_TIMEOUT_SEC = 24 * 60 * 60;

/** 本番（AUTH_URL が https）では Cookie に Secure を付け、平文 HTTP で送出されないようにする */
export const USE_SECURE_COOKIES = process.env.AUTH_URL?.startsWith("https://") ?? false;
