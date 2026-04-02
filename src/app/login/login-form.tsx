"use client";

import { useState } from "react";

export function LoginForm({
  callbackUrl,
  error,
}: {
  callbackUrl: string;
  error?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          メールアドレスまたはパスワードが正しくありません
        </div>
      )}

      <form
        action="/api/login"
        method="POST"
        onSubmit={() => setLoading(true)}
        className="space-y-4"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            メールアドレス
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full border border-stone-300 rounded-lg px-4 py-2 text-base text-stone-800 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="example@temple.or.jp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            パスワード
          </label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full border border-stone-300 rounded-lg px-4 py-2 text-base text-stone-800 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-stone-700 transition-colors mt-2 disabled:opacity-60"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </>
  );
}
