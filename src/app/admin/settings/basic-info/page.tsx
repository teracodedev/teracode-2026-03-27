"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_NENKAI_POSTCARD_FOOTER } from "@/lib/nenkai-postcard-config";

type NenkaiConfig = {
  senderName: string | null;
  senderAddress: string | null;
  footer: string;
  footerIsDefault?: boolean;
};

export default function BasicInfoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    senderName: "",
    senderAddress: "",
    footer: "",
  });

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/settings/nenkai-postcard");
    const data = (await res.json()) as NenkaiConfig & { error?: string };
    if (!res.ok) {
      setError(data.error || "読み込みに失敗しました");
      setLoading(false);
      return;
    }
    setForm({
      senderName: data.senderName ?? "",
      senderAddress: data.senderAddress ?? "",
      footer: data.footer ?? DEFAULT_NENKAI_POSTCARD_FOOTER,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const res = await fetch("/api/settings/nenkai-postcard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderName: form.senderName,
        senderAddress: form.senderAddress,
        footer: form.footer,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "保存に失敗しました");
      return;
    }
    setSuccess("保存しました");
    setForm({
      senderName: data.senderName ?? "",
      senderAddress: data.senderAddress ?? "",
      footer: data.footer ?? DEFAULT_NENKAI_POSTCARD_FOOTER,
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href="/admin/settings"
          className="text-sm text-amber-700 hover:text-amber-800 mb-2 inline-block"
        >
          ← 各種設定
        </Link>
        <h1 className="text-2xl font-bold text-amber-700">基本情報設定</h1>
        <p className="text-stone-500 text-sm mt-1">
          年回案内ハガキ（裏面）に印字する差出人名・住所・連絡案内を設定します。
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-stone-400 text-sm">読み込み中...</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-6">
          <div>
            <label htmlFor="senderName" className="block text-sm font-medium text-stone-700 mb-1">
              差出人名
            </label>
            <input
              id="senderName"
              type="text"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="例: ○○寺"
              value={form.senderName}
              onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
            />
            <p className="mt-1 text-xs text-stone-500">ハガキ左下に縦書きで表示します（未入力の場合は表示しません）。</p>
          </div>

          <div>
            <label htmlFor="senderAddress" className="block text-sm font-medium text-stone-700 mb-1">
              住所
            </label>
            <textarea
              id="senderAddress"
              rows={4}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
              placeholder={"〒000-0000\n都道府県…"}
              value={form.senderAddress}
              onChange={(e) => setForm((f) => ({ ...f, senderAddress: e.target.value }))}
            />
            <p className="mt-1 text-xs text-stone-500">複数行可。差出人名の下に表示します。</p>
          </div>

          <div>
            <label htmlFor="footer" className="block text-sm font-medium text-stone-700 mb-1">
              連絡・案内文（左下）
            </label>
            <textarea
              id="footer"
              rows={5}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm leading-relaxed"
              value={form.footer}
              onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
            />
            <p className="mt-1 text-xs text-stone-500">
              電話・メール・予約案内など。空にして保存すると既定の文面が使われます。
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
