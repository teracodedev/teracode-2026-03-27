"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { isoDateToWareki, numToKanji, yearToWareki } from "@/lib/kanji-num";
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

function ageToKanji(age: string | null): string {
  if (!age) return "";
  const m = age.match(/\d+/);
  if (!m) return age;
  const n = parseInt(m[0], 10);
  if (!Number.isFinite(n)) return age;
  return numToKanji(n);
}

export default function NenkaihyoPostcardPage() {
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

  const grouped = useMemo(() => {
    const map = new Map<string, { householder: NenkaiItem["householder"]; members: NenkaiItem[] }>();
    for (const it of items) {
      const key = it.householder.id;
      const cur = map.get(key);
      if (cur) cur.members.push(it);
      else map.set(key, { householder: it.householder, members: [it] });
    }
    return Array.from(map.values()).sort((a, b) => {
      const ka = (a.householder.familyNameKana ?? "") + (a.householder.givenNameKana ?? "");
      const kb = (b.householder.familyNameKana ?? "") + (b.householder.givenNameKana ?? "");
      return ka.localeCompare(kb, "ja");
    });
  }, [items]);

  const warekiYear = yearToWareki(year);

  if (loading) return <div className="p-8 text-stone-500">読み込み中...</div>;

  return (
    <>
      <style jsx global>{`
        @page {
          size: 100mm 148mm;
          margin: 0;
        }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          /* アプリのナビバー・mainラッパーを非表示 */
          body > nav,
          nav.bg-stone-800,
          header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .no-print { display: none !important; }
          .postcard {
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          .postcard:last-child { page-break-after: auto; }
        }

        .postcard {
          width: 100mm;
          height: 148mm;
          padding: 8mm 5mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          font-family: "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif;
          /* コンテナは通常の横書き。flex で子要素を右→左に配置 */
          display: flex;
          flex-direction: row-reverse;
          align-items: stretch;
          gap: 0;
          overflow: hidden;
        }
        /* 各列は縦書き */
        .postcard > div {
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          flex-shrink: 0;
          line-height: 1.7;
        }

        .col-title {
          font-size: 14pt;
          font-weight: bold;
          letter-spacing: 0.2em;
          padding: 10mm 1mm 0 1mm;
        }
        .col-intro {
          font-size: 9pt;
          letter-spacing: 0.05em;
          padding: 10mm 0.5mm 0 0.5mm;
          max-width: 24mm;
        }
        .col-body {
          font-size: 10pt;
          letter-spacing: 0.08em;
          flex: 1 1 auto !important;
          min-width: 0;
          padding: 4mm 1mm 0 1mm;
        }
        .col-body .kaiki-label {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 3mm;
          text-align: center;
        }
        .col-body .detail-line {
          font-size: 10pt;
        }
        .col-footer {
          font-size: 7pt;
          letter-spacing: 0.02em;
          line-height: 1.4;
          padding: 5mm 0.5mm 0 0.5mm;
          max-width: 18mm;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">
          {year}年{month}月 案内ハガキ(裏面) — {grouped.length}世帯 / {items.length}名
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium"
        >
          PDFで保存 / 印刷
        </button>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white flex flex-col items-center gap-4 print:gap-0">
        {grouped.length === 0 && (
          <div className="no-print text-stone-500 py-12">該当する年回はありません</div>
        )}
        {grouped.map((g, gi) => (
          <div key={gi} className="postcard shadow border border-stone-300 print:shadow-none print:border-0">
            {/* 右端: タイトル */}
            <div className="col-title">
              {warekiYear}
              <br />
              ご法事のご案内
            </div>

            {/* 導入文 */}
            <div className="col-intro">
              {warekiYear}の年回を左記のようにお迎えになっております。
              ご法事を営まれ、ご仏縁を結ばれますようご案内申し上げます。
            </div>

            {/* 本文: 故人ごとの詳細 */}
            <div className="col-body">
              {g.members.map((m) => (
                <div key={m.memberId} style={{ marginLeft: g.members.length > 1 ? "1mm" : 0 }}>
                  <div className="kaiki-label">{m.kaikiLabel}</div>
                  {m.dharmaName && <div className="detail-line">法名　{m.dharmaName}</div>}
                  <div className="detail-line">命日　{isoDateToWareki(m.deathDate)}</div>
                  <div className="detail-line">
                    俗名　{[m.familyName, m.givenName].filter(Boolean).join("　")}　様
                  </div>
                  {m.ageAtDeath && (
                    <div className="detail-line">享年　{ageToKanji(m.ageAtDeath)}歳</div>
                  )}
                </div>
              ))}
            </div>

            {/* 左端: 連絡先 */}
            <div className="col-footer">
              電話(〇九〇ー二五五三ー三三四六)・メール(zenpoji@gmail.com)で早めに予約されるとご希望の日取りに沿いやすくなります。インターネットを使ったご法事も承っております。気軽にご相談ください。
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
