"use client";

import { useState } from "react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });

      if (res.ok) {
        window.location.href = callbackUrl;
      } else {
        setError(true);
        setLoading(false);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          メールアドレスまたはパスワードが正しくありません
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
