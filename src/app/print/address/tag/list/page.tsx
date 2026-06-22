"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

export default function TagAddressPrintListPage() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const tags = sp.get("tags") ?? "";
  const notTags = sp.get("notTags") ?? "";
  const exclude = sp.get("exclude") ?? "";

  const [items, setItems] = useState<Householder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (tags) params.set("tags", tags);
        if (notTags) params.set("notTags", notTags);

        const res = await fetchWithAuth(`/api/householder?${params.toString()}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [notTags, q, tags]);

  const excludedIds = useMemo(
    () =>
      new Set(
        exclude
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    [exclude],
  );

  const listItems = useMemo(
    () =>
      items
        .filter((h) => !excludedIds.has(h.id))
        .sort((a, b) => {
          const ka = `${a.familyNameKana ?? a.familyName}${a.givenNameKana ?? a.givenName}`;
          const kb = `${b.familyNameKana ?? b.familyName}${b.givenNameKana ?? b.givenName}`;
          return ka.localeCompare(kb, "ja");
        }),
    [items, excludedIds],
  );

  if (loading) return <div className="p-8 text-stone-500">読み込み中...</div>;

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body > nav,
          nav.bg-stone-800,
          header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .no-print { display: none !important; }
          .sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        .sheet {
          width: 186mm;
          margin: 0 auto;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          padding: 8mm;
          font-family: "Yu Gothic", "YuGothic", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;
        }
        .list-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5pt;
        }
        .list-table th,
        .list-table td {
          border: 0.3mm solid #555;
          padding: 1.6mm 2.2mm;
          text-align: left;
          vertical-align: top;
        }
        .list-table th {
          background: #f0ede8;
          font-weight: 600;
          white-space: nowrap;
        }
        .list-table td.col-no,
        .list-table th.col-no {
          text-align: center;
          width: 12mm;
          white-space: nowrap;
        }
        .list-table td.col-name,
        .list-table th.col-name {
          width: 45mm;
          white-space: nowrap;
        }
        .list-table td.col-zip,
        .list-table th.col-zip {
          width: 28mm;
          white-space: nowrap;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">タグ抽出 一覧 — {listItems.length}件</div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium"
        >
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white">
        <div className="sheet shadow border border-stone-300 print:shadow-none print:border-0">
          <h1 className="text-lg font-bold mb-3">抽出戸主一覧</h1>
          {listItems.length === 0 ? (
            <div className="text-stone-500 py-12 text-center">該当する戸主はいません</div>
          ) : (
            <table className="list-table">
              <thead>
                <tr>
                  <th className="col-no">No.</th>
                  <th className="col-name">戸主</th>
                  <th className="col-zip">郵便番号</th>
                  <th>住所</th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((h, i) => (
                  <tr key={h.id}>
                    <td className="col-no">{i + 1}</td>
                    <td className="col-name">
                      {h.familyName} {h.givenName}
                    </td>
                    <td className="col-zip">{h.postalCode || "-"}</td>
                    <td>
                      {[h.address1, h.address2, h.address3].filter(Boolean).join("") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
