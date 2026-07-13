"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface NenkaiItem {
  memberId: string;
  familyName: string;
  givenName: string | null;
  dharmaName: string | null;
  deathDate: string;
  kaikiLabel: string;
  householder: {
    id: string;
    familyName: string;
    givenName: string;
  };
}

function formatMD(iso: string): string {
  const d = new Date(iso);
  return d.getMonth() + 1 + "月" + d.getDate() + "日";
}

export default function NenkaihyoPrintListPage() {
  const sp = useSearchParams();
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1), 10);
  const exclude = sp.get("exclude") ?? "";

  const [items, setItems] = useState<NenkaiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/api/kakocho/nenkai?year=${year}&month=${month}`);
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

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
    () => items.filter((it) => !excludedIds.has(it.memberId)),
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
          white-space: nowrap;
        }
        .list-table td.col-date,
        .list-table th.col-date {
          width: 22mm;
          white-space: nowrap;
        }
        .list-table td.col-kaiki,
        .list-table th.col-kaiki {
          width: 20mm;
          white-space: nowrap;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">
          {year}年{month}月 年回対象者一覧 — {listItems.length}件
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium"
        >
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white">
        <div className="sheet shadow border border-stone-300 print:shadow-none print:border-0">
          <h1 className="text-lg font-bold mb-3">
            {year}年{month}月 年回対象者一覧
          </h1>
          {listItems.length === 0 ? (
            <div className="text-stone-500 py-12 text-center">該当する年回はありません</div>
          ) : (
            <table className="list-table">
              <thead>
                <tr>
                  <th className="col-no">No.</th>
                  <th className="col-name">戸主</th>
                  <th className="col-name">故人</th>
                  <th className="col-date">命日</th>
                  <th className="col-kaiki">回忌</th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((m, i) => (
                  <tr key={m.memberId}>
                    <td className="col-no">{i + 1}</td>
                    <td className="col-name">
                      {m.householder.familyName} {m.householder.givenName}
                    </td>
                    <td className="col-name">
                      {[m.familyName, m.givenName].filter(Boolean).join(" ")}
                      {m.dharmaName ? `（${m.dharmaName}）` : ""}
                    </td>
                    <td className="col-date">{formatMD(m.deathDate)}</td>
                    <td className="col-kaiki">{m.kaikiLabel}</td>
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
