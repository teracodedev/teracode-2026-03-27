"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  DEFAULT_NENKAI_POSTCARD_FOOTER,
  DEFAULT_NENKAI_POSTCARD_INTRO,
} from "@/lib/nenkai-postcard-config";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface NenkaiItem {
  memberId: string;
  familyName: string;
  givenName: string | null;
  dharmaName: string | null;
  relation: string | null;
  ageAtDeath: string | null;
  deathDate: string;
  kaiki: number;
  kaikiLabel: string;
  householder: {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    familyNameKana: string | null;
    givenNameKana: string | null;
    postalCode: string | null;
    address1: string | null;
    address2: string | null;
    address3: string | null;
  };
}

type PostcardConfig = {
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
  intro: string;
  footer: string;
};

function formatMD(iso: string): string {
  const d = new Date(iso);
  return d.getMonth() + 1 + "月" + d.getDate() + "日";
}

export default function NenkaihyoPrintPage() {
  const initialYear = useMemo(() => new Date().getFullYear(), []);
  const initialMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [items, setItems] = useState<NenkaiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState("");
  const [noticeIntro, setNoticeIntro] = useState("");
  const [noticeFooter, setNoticeFooter] = useState("");
  const [fullConfig, setFullConfig] = useState<PostcardConfig | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/kakocho/nenkai?year=${year}&month=${month}`);
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [year, month]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = initialYear - 2; y <= initialYear + 5; y++) arr.push(y);
    return arr;
  }, [initialYear]);

  const openNoticeModal = async () => {
    setShowNoticeModal(true);
    setNoticeLoading(true);
    setNoticeError("");
    setNoticeSuccess("");
    try {
      const res = await fetchWithAuth("/api/settings/nenkai-postcard");
      const data = await res.json();
      setFullConfig(data);
      setNoticeIntro(data.intro ?? DEFAULT_NENKAI_POSTCARD_INTRO);
      setNoticeFooter(data.footer ?? DEFAULT_NENKAI_POSTCARD_FOOTER);
    } catch {
      setNoticeError("読み込みに失敗しました");
    } finally {
      setNoticeLoading(false);
    }
  };

  const saveNotice = async () => {
    setNoticeSaving(true);
    setNoticeError("");
    setNoticeSuccess("");
    try {
      const res = await fetchWithAuth("/api/settings/nenkai-postcard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: null,
          senderAddress: null,
          sect: fullConfig?.sect ?? "",
          ingo: fullConfig?.ingo ?? "",
          sango: fullConfig?.sango ?? "",
          templeName: fullConfig?.templeName ?? "",
          chiefPriest: fullConfig?.chiefPriest ?? "",
          chiefTitle: fullConfig?.chiefTitle ?? "",
          senderPostalCode: fullConfig?.senderPostalCode ?? "",
          senderAddressLine1: fullConfig?.senderAddressLine1 ?? "",
          senderAddressLine2: fullConfig?.senderAddressLine2 ?? "",
          phone: fullConfig?.phone ?? "",
          fax: fullConfig?.fax ?? "",
          mobile: fullConfig?.mobile ?? "",
          intro: noticeIntro,
          footer: noticeFooter,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoticeError(data.error || "保存に失敗しました");
        return;
      }
      setNoticeSuccess("保存しました");
      setFullConfig(data);
    } catch {
      setNoticeError("保存に失敗しました");
    } finally {
      setNoticeSaving(false);
    }
  };

  const qs = `?year=${year}&month=${month}`;

  const inputCls =
    "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">年回表の印刷</h1>
        <p className="text-sm text-stone-500 mt-1">
          月を選ぶとその月に年回が当たる方を抽出します。案内文面（裏面）と宛名（表面・差出人印字）を PDF として出力できます。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">年</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white text-stone-800"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">月</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white text-stone-800"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button
            onClick={openNoticeModal}
            className="px-4 py-2 rounded-lg font-medium border border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            文面の編集
          </button>
          <Link
            href={`/print/nenkaihyo/postcard${qs}`}
            target="_blank"
            className={
              "inline-block px-4 py-2 rounded-lg text-white font-medium " +
              (items.length === 0 ? "bg-stone-300 pointer-events-none" : "bg-amber-700 hover:bg-amber-800")
            }
          >
            案内ハガキ(裏面) PDF
          </Link>
          <Link
            href={`/print/nenkaihyo/address${qs}`}
            target="_blank"
            className={
              "inline-block px-4 py-2 rounded-lg text-white font-medium " +
              (items.length === 0 ? "bg-stone-300 pointer-events-none" : "bg-amber-700 hover:bg-amber-800")
            }
          >
            宛名(表面) PDF
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : !loaded ? null : items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          {year}年{month}月に該当する年回はありません
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-stone-500">{items.length}名</div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">戸主</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">故人</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">命日</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">回忌</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">享年</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">住所</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((m) => (
                  <tr key={m.memberId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-700">
                      {m.householder.familyName} {m.householder.givenName}
                    </td>
                    <td className="px-4 py-3 text-stone-800">
                      {[m.familyName, m.givenName].filter(Boolean).join(" ")}
                      {m.dharmaName && (
                        <span className="text-stone-500 text-xs ml-2">{m.dharmaName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatMD(m.deathDate)}</td>
                    <td className="px-4 py-3 text-stone-600">{m.kaikiLabel}</td>
                    <td className="px-4 py-3 text-stone-600">{m.ageAtDeath ?? ""}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {[m.householder.address1, m.householder.address2, m.householder.address3]
                        .filter(Boolean)
                        .join("")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <Link href="/print" className="text-sm font-medium text-amber-700 hover:text-amber-600">
          ← 各種印刷へ戻る
        </Link>
      </div>

      {showNoticeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-amber-700">案内文面の編集（ハガキ裏面）</h2>
                <button
                  onClick={() => setShowNoticeModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {noticeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {noticeError}
                </div>
              )}
              {noticeSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {noticeSuccess}
                </div>
              )}

              {noticeLoading ? (
                <div className="text-stone-400 text-sm py-4">読み込み中...</div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      右の文面（2行）
                    </label>
                    <textarea
                      rows={6}
                      className={`${inputCls} text-sm leading-relaxed`}
                      value={noticeIntro}
                      onChange={(e) => setNoticeIntro(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      改行で2行にできます。空にして保存すると既定の文面が使われます。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      連絡・案内文（左下）
                    </label>
                    <textarea
                      rows={10}
                      className={`${inputCls} text-sm leading-relaxed`}
                      value={noticeFooter}
                      onChange={(e) => setNoticeFooter(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      電話・メール・予約案内など。空にして保存すると既定の文面が使われます。
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveNotice}
                      disabled={noticeSaving}
                      className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {noticeSaving ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={() => setShowNoticeModal(false)}
                      className="px-5 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-sm font-medium"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
