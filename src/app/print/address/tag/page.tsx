"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TagFilter } from "@/components/TagFilter";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Householder {
  id: string;
  familyName: string;
  givenName: string;
  familyNameKana: string | null;
  givenNameKana: string | null;
  postalCode: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
}

export default function TagAddressPrintPage() {
  const [items, setItems] = useState<Householder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [notTagIds, setNotTagIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","));
      if (notTagIds.length > 0) params.set("notTags", notTagIds.join(","));
      const res = await fetchWithAuth(`/api/householder?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [notTagIds, query, selectedTagIds]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const ka = `${a.familyNameKana ?? a.familyName}${a.givenNameKana ?? a.givenName}`;
      const kb = `${b.familyNameKana ?? b.familyName}${b.givenNameKana ?? b.givenName}`;
      return ka.localeCompare(kb, "ja");
    });
  }, [items]);

  const printHref = useMemo(() => {
    const sp = new URLSearchParams();
    if (query.trim()) sp.set("q", query.trim());
    if (selectedTagIds.length > 0) sp.set("tags", selectedTagIds.join(","));
    if (notTagIds.length > 0) sp.set("notTags", notTagIds.join(","));
    return `/print/address/tag/surface?${sp.toString()}`;
  }, [notTagIds, query, selectedTagIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">タグで抽出して印刷</h1>
        <p className="text-sm text-stone-500 mt-1">
          タグ条件（AND / NOT）と検索条件で戸主を抽出し、宛名ハガキを印刷します。
        </p>
        <p className="text-xs text-stone-400 mt-1">タグ条件は未選択・AND・NOTを切替できます。</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="氏名・住所で検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-base text-stone-800 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <TagFilter
            selectedTagIds={selectedTagIds}
            notTagIds={notTagIds}
            onChange={(ids, notIds) => {
              setSelectedTagIds(ids);
              setNotTagIds(notIds);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            {loading ? "抽出中..." : `${sortedItems.length}件`}
          </span>
          <a
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            className={
              "ml-auto inline-block px-4 py-2 rounded-lg text-white font-medium " +
              (sortedItems.length === 0
                ? "bg-stone-300 pointer-events-none"
                : "bg-amber-700 hover:bg-amber-800")
            }
          >
            宛名(表面) PDF
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          条件に一致する戸主はいません
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">戸主</th>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">住所</th>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">郵便番号</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedItems.map((h) => (
                <tr key={h.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-800">
                    {h.familyName} {h.givenName}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {[h.address1, h.address2, h.address3].filter(Boolean).join("") || "-"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{h.postalCode || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <Link
          href="/print"
          className="text-sm font-medium text-amber-700 hover:text-amber-600"
        >
          ← 各種印刷へ戻る
        </Link>
      </div>
    </div>
  );
}
