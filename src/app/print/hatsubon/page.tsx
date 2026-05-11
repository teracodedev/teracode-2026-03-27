"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DeceasedItem {
  memberId: string;
  familyName: string;
  givenName: string | null;
  dharmaName: string | null;
  relation: string | null;
  ageAtDeath: string | null;
  deathDate: string;
}

interface HatsubonItem {
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
  deceased: DeceasedItem[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function HatsubonPrintPage() {
  const [items, setItems] = useState<HatsubonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/hatsubon");
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setFromDate(data?.fromDate ?? "");
      setToDate(data?.toDate ?? "");
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalDeceased = items.reduce((sum, it) => sum + it.deceased.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">初盆の印刷</h1>
        <p className="text-sm text-stone-500 mt-1">
          初盆を迎える物故者のいる戸主を抽出し、ハガキの宛名（表面）を印刷します。
        </p>
        {fromDate && toDate && (
          <p className="text-sm text-stone-500 mt-1">
            対象期間: {formatDate(fromDate)} 〜 {formatDate(toDate)} に亡くなった方
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="ml-auto flex gap-2 flex-wrap">
          <Link
            href="/print/hatsubon/address"
            target="_blank"
            className={
              "inline-block px-4 py-2 rounded-lg text-white font-medium " +
              (items.length === 0
                ? "bg-stone-300 pointer-events-none"
                : "bg-amber-700 hover:bg-amber-800")
            }
          >
            宛名(表面) PDF
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          初盆に該当する戸主はいません
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-stone-500">
            {items.length}世帯（物故者{totalDeceased}名）
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    戸主
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    故人
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    命日
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    享年
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    住所
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.flatMap((item) =>
                  item.deceased.map((d, di) => (
                    <tr
                      key={d.memberId}
                      className="hover:bg-stone-50"
                    >
                      <td className="px-4 py-3 text-stone-700">
                        {di === 0
                          ? `${item.householder.familyName} ${item.householder.givenName}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-stone-800">
                        {[d.familyName, d.givenName]
                          .filter(Boolean)
                          .join(" ")}
                        {d.dharmaName && (
                          <span className="text-stone-500 text-xs ml-2">
                            {d.dharmaName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(d.deathDate)}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {d.ageAtDeath ?? ""}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs">
                        {di === 0
                          ? [
                              item.householder.address1,
                              item.householder.address2,
                              item.householder.address3,
                            ]
                              .filter(Boolean)
                              .join("")
                          : ""}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
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
