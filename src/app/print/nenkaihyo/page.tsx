"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
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

  const qs = `?year=${year}&month=${month}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">年回表の印刷</h1>
        <p className="text-sm text-stone-500 mt-1">
          月を選ぶとその月に年回が当たる方を抽出します。案内ハガキ(裏面)と宛名を PDF として出力できます。
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
        <div className="ml-auto flex gap-2">
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
            宛名 PDF
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
    </div>
  );
}
