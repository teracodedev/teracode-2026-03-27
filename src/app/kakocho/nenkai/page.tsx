"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

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
  return (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

export default function NenkaiInvitationPage() {
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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // 戸主単位にグループ化
  const grouped = useMemo(() => {
    const map = new Map<string, { householderId: string; householder: NenkaiItem["householder"]; members: NenkaiItem[] }>();
    for (const it of items) {
      const key = it.householder.id;
      const cur = map.get(key);
      if (cur) cur.members.push(it);
      else map.set(key, { householderId: key, householder: it.householder, members: [it] });
    }
    return Array.from(map.values()).sort((a, b) => {
      const ka = (a.householder.familyNameKana ?? "") + (a.householder.givenNameKana ?? "");
      const kb = (b.householder.familyNameKana ?? "") + (b.householder.givenNameKana ?? "");
      return ka.localeCompare(kb, "ja");
    });
  }, [items]);

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = initialYear - 2; y <= initialYear + 5; y++) arr.push(y);
    return arr;
  }, [initialYear]);

  const printHref = `/kakocho/nenkai/print?year=${year}&month=${month}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-amber-700">年回案内ハガキ</h1>
          <p className="text-sm text-stone-500 mt-1">指定した年月に年回が当たる方の案内ハガキを印刷します</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">年</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white text-stone-800"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">月</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white text-stone-800"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <Link
            href={printHref}
            target="_blank"
            className={
              "inline-block px-5 py-2 rounded-lg text-white font-medium " +
              (items.length === 0 ? "bg-stone-300 pointer-events-none" : "bg-amber-700 hover:bg-amber-800")
            }
          >
            ハガキを印刷
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : !loaded ? null : grouped.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          {year}年{month}月に該当する年回はありません
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-stone-500">{grouped.length}世帯 / {items.length}名</div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">戸主</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">故人</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">命日</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">回忌</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">住所</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {grouped.flatMap((g) =>
                  g.members.map((m, idx) => (
                    <tr key={m.memberId} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-700">
                        {idx === 0 ? (
                          <Link href={"/householder/" + g.householder.id} className="hover:underline">
                            {g.householder.familyName} {g.householder.givenName}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-stone-800">
                        {[m.familyName, m.givenName].filter(Boolean).join(" ")}
                        {m.dharmaName && <span className="text-stone-500 text-xs ml-2">{m.dharmaName}</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatMD(m.deathDate)}</td>
                      <td className="px-4 py-3 text-stone-600">{m.kaikiLabel}</td>
                      <td className="px-4 py-3 text-stone-500 text-xs">
                        {idx === 0 ? [g.householder.address1, g.householder.address2, g.householder.address3].filter(Boolean).join("") : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
