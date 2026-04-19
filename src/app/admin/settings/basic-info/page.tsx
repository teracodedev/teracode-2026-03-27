"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_NENKAI_POSTCARD_FOOTER } from "@/lib/nenkai-postcard-config";

type NenkaiConfigResponse = {
  senderName: string | null;
  senderAddress: string | null;
  sect: string | null;
  ingo: string | null;
  sango: string | null;
  templeName: string | null;
  chiefPriest: string | null;
  chiefTitle: string | null;
  senderPostalCode: string | null;
  senderAddressLine1: string | null;
  senderAddressLine2: string | null;
  phone: string | null;
  fax: string | null;
  mobile: string | null;
  footer: string;
  footerIsDefault?: boolean;
  error?: string;
};

export default function BasicInfoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    sect: "",
    ingo: "",
    sango: "",
    templeName: "",
    chiefPriest: "",
    chiefTitle: "",
    senderPostalCode: "",
    senderAddressLine1: "",
    senderAddressLine2: "",
    phone: "",
    fax: "",
    mobile: "",
    footer: "",
  });

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/settings/nenkai-postcard");
    const data = (await res.json()) as NenkaiConfigResponse;
    if (!res.ok) {
      setError(data.error || "読み込みに失敗しました");
      setLoading(false);
      return;
    }
    setForm({
      sect: data.sect ?? "",
      ingo: data.ingo ?? "",
      sango: data.sango ?? "",
      templeName: data.templeName ?? "",
      chiefPriest: data.chiefPriest ?? "",
      chiefTitle: data.chiefTitle ?? "",
      senderPostalCode: data.senderPostalCode ?? "",
      senderAddressLine1: data.senderAddressLine1 ?? "",
      senderAddressLine2: data.senderAddressLine2 ?? "",
      phone: data.phone ?? "",
      fax: data.fax ?? "",
      mobile: data.mobile ?? "",
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
        senderName: null,
        senderAddress: null,
        sect: form.sect,
        ingo: form.ingo,
        sango: form.sango,
        templeName: form.templeName,
        chiefPriest: form.chiefPriest,
        chiefTitle: form.chiefTitle,
        senderPostalCode: form.senderPostalCode,
        senderAddressLine1: form.senderAddressLine1,
        senderAddressLine2: form.senderAddressLine2,
        phone: form.phone,
        fax: form.fax,
        mobile: form.mobile,
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
      sect: data.sect ?? "",
      ingo: data.ingo ?? "",
      sango: data.sango ?? "",
      templeName: data.templeName ?? "",
      chiefPriest: data.chiefPriest ?? "",
      chiefTitle: data.chiefTitle ?? "",
      senderPostalCode: data.senderPostalCode ?? "",
      senderAddressLine1: data.senderAddressLine1 ?? "",
      senderAddressLine2: data.senderAddressLine2 ?? "",
      phone: data.phone ?? "",
      fax: data.fax ?? "",
      mobile: data.mobile ?? "",
      footer: data.footer ?? DEFAULT_NENKAI_POSTCARD_FOOTER,
    });
  };

  const inputCls =
    "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link
          href="/admin/settings"
          className="text-sm text-amber-700 hover:text-amber-800 mb-2 inline-block"
        >
          ← 各種設定
        </Link>
        <h1 className="text-2xl font-bold text-amber-700">基本情報設定</h1>
        <p className="text-stone-500 text-sm mt-1">
          寺院情報・差出人の住所・連絡先を登録します。宛名面（表面）では番号を漢数字に変換して印字します。案内文は年回案内ハガキ裏面の左下に使います。
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
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-stone-800 border-b border-stone-100 pb-2">
                寺院・差出人（宛名・ハガキ表面）
              </h2>

              <div>
                <label htmlFor="sect" className="block text-sm font-medium text-stone-700 mb-1">
                  宗派
                </label>
                <input id="sect" type="text" className={inputCls} value={form.sect} onChange={(e) => setForm((f) => ({ ...f, sect: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="ingo" className="block text-sm font-medium text-stone-700 mb-1">
                  院号
                </label>
                <input id="ingo" type="text" className={inputCls} value={form.ingo} onChange={(e) => setForm((f) => ({ ...f, ingo: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="sango" className="block text-sm font-medium text-stone-700 mb-1">
                  山号
                </label>
                <input id="sango" type="text" className={inputCls} value={form.sango} onChange={(e) => setForm((f) => ({ ...f, sango: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="templeName" className="block text-sm font-medium text-stone-700 mb-1">
                  寺院名
                </label>
                <input
                  id="templeName"
                  type="text"
                  className={inputCls}
                  value={form.templeName}
                  onChange={(e) => setForm((f) => ({ ...f, templeName: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="chiefPriest" className="block text-sm font-medium text-stone-700 mb-1">
                  住職氏名
                </label>
                <input
                  id="chiefPriest"
                  type="text"
                  className={inputCls}
                  value={form.chiefPriest}
                  onChange={(e) => setForm((f) => ({ ...f, chiefPriest: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="chiefTitle" className="block text-sm font-medium text-stone-700 mb-1">
                  役職
                </label>
                <input
                  id="chiefTitle"
                  type="text"
                  className={inputCls}
                  placeholder="例: 住職"
                  value={form.chiefTitle}
                  onChange={(e) => setForm((f) => ({ ...f, chiefTitle: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="senderPostalCode" className="block text-sm font-medium text-stone-700 mb-1">
                  郵便番号
                </label>
                <input
                  id="senderPostalCode"
                  type="text"
                  className={inputCls}
                  placeholder="7330812"
                  value={form.senderPostalCode}
                  onChange={(e) => setForm((f) => ({ ...f, senderPostalCode: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="senderAddressLine1" className="block text-sm font-medium text-stone-700 mb-1">
                  住所（上段）
                </label>
                <input
                  id="senderAddressLine1"
                  type="text"
                  className={inputCls}
                  placeholder="広島県広島市西区己斐本町"
                  value={form.senderAddressLine1}
                  onChange={(e) => setForm((f) => ({ ...f, senderAddressLine1: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="senderAddressLine2" className="block text-sm font-medium text-stone-700 mb-1">
                  住所（下段・番地）
                </label>
                <input
                  id="senderAddressLine2"
                  type="text"
                  className={inputCls}
                  placeholder="3-10-8"
                  value={form.senderAddressLine2}
                  onChange={(e) => setForm((f) => ({ ...f, senderAddressLine2: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1">
                  電話
                </label>
                <input id="phone" type="text" className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="fax" className="block text-sm font-medium text-stone-700 mb-1">
                  FAX
                </label>
                <input id="fax" type="text" className={inputCls} value={form.fax} onChange={(e) => setForm((f) => ({ ...f, fax: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-stone-700 mb-1">
                  携帯
                </label>
                <input id="mobile" type="text" className={inputCls} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-stone-800 border-b border-stone-100 pb-2">
                連絡・案内文（ハガキ裏面・左下）
              </h2>
              <div>
                <label htmlFor="footer" className="block text-sm font-medium text-stone-700 mb-1">
                  連絡・案内文
                </label>
                <textarea
                  id="footer"
                  rows={12}
                  className={`${inputCls} text-sm leading-relaxed min-h-[280px]`}
                  value={form.footer}
                  onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
                />
                <p className="mt-1 text-xs text-stone-500">
                  電話・メール・予約案内など。空にして保存すると既定の文面が使われます。
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
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
