"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

export default function NenkaihyoAddressPage() {
  const sp = useSearchParams();
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1), 10);

  const [items, setItems] = useState<NenkaiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/kakocho/nenkai?year=${year}&month=${month}`);
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  // 戸主単位に重複排除
  const householders = useMemo(() => {
    const map = new Map<string, NenkaiItem["householder"]>();
    for (const it of items) {
      if (!map.has(it.householder.id)) map.set(it.householder.id, it.householder);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ka = (a.familyNameKana ?? "") + (a.givenNameKana ?? "");
      const kb = (b.familyNameKana ?? "") + (b.givenNameKana ?? "");
      return ka.localeCompare(kb, "ja");
    });
  }, [items]);

  if (loading) return <div className="p-8 text-stone-500">読み込み中...</div>;

  return (
    <>
      <style jsx global>{`
        @page {
          size: 100mm 148mm;
          margin: 0;
        }
        @media print {
          html,
          body {
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          .postcard {
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          .postcard:last-child {
            page-break-after: auto;
          }
        }
        .postcard {
          width: 100mm;
          height: 148mm;
          padding: 8mm 6mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          font-family: "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif;
          position: relative;
        }
        /* 郵便番号枠(ハガキ上部) */
        .postal-box {
          position: absolute;
          top: 8mm;
          right: 15mm;
          display: flex;
          gap: 0.8mm;
        }
        .postal-box .digit {
          width: 4.5mm;
          height: 6mm;
          border: 0.3pt solid #d00;
          text-align: center;
          line-height: 6mm;
          font-size: 11pt;
          color: #000;
        }
        .postal-box .sep {
          width: 1mm;
        }
        /* 宛先(住所)縦書き */
        .addr-block {
          position: absolute;
          top: 22mm;
          right: 10mm;
          bottom: 20mm;
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          font-size: 12pt;
          line-height: 1.5;
          letter-spacing: 0.08em;
        }
        /* 氏名は中央大きく */
        .name-block {
          position: absolute;
          top: 35mm;
          left: 0;
          right: 0;
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          font-size: 20pt;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-align: center;
          height: 90mm;
          display: flex;
          justify-content: center;
        }
        .name-block .sama {
          font-size: 14pt;
          margin-top: 3mm;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">
          {year}年{month}月 宛名 — {householders.length}世帯
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium"
        >
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white flex flex-col items-center gap-4 print:gap-0">
        {householders.length === 0 && (
          <div className="no-print text-stone-500 py-12">該当する戸主はいません</div>
        )}
        {householders.map((h) => {
          const zip = (h.postalCode ?? "").replace(/[^0-9]/g, "").padEnd(7, " ").slice(0, 7);
          const addr = [h.address1, h.address2, h.address3].filter(Boolean).join("");
          return (
            <div
              key={h.id}
              className="postcard shadow border border-stone-300 print:shadow-none print:border-0"
            >
              {/* 郵便番号 */}
              <div className="postal-box">
                <div className="digit">{zip[0]?.trim() || ""}</div>
                <div className="digit">{zip[1]?.trim() || ""}</div>
                <div className="digit">{zip[2]?.trim() || ""}</div>
                <div className="sep" />
                <div className="digit">{zip[3]?.trim() || ""}</div>
                <div className="digit">{zip[4]?.trim() || ""}</div>
                <div className="digit">{zip[5]?.trim() || ""}</div>
                <div className="digit">{zip[6]?.trim() || ""}</div>
              </div>

              {/* 住所(縦書き) */}
              <div className="addr-block">{addr}</div>

              {/* 氏名(中央大きく) */}
              <div className="name-block">
                <div>
                  {h.familyName}　{h.givenName}
                  <span className="sama">　様</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
