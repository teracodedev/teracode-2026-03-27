"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { compareHouseholderGojuon } from "@/lib/householder-sort";
import { isoDateToWareki, numToKanji, yearToWareki } from "@/lib/kanji-num";
import { DEFAULT_NENKAI_POSTCARD_FOOTER } from "@/lib/nenkai-postcard-config";
import { Fragment, useEffect, useMemo, useState } from "react";
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
  const [postcardFooter, setPostcardFooter] = useState(DEFAULT_NENKAI_POSTCARD_FOOTER);

  useEffect(() => {
    (async () => {
      try {
        const [resItems, resCfg] = await Promise.all([
          fetchWithAuth(`/api/kakocho/nenkai?year=${year}&month=${month}`),
          fetchWithAuth(`/api/settings/nenkai-postcard`),
        ]);
        const data = await resItems.json();
        setItems(Array.isArray(data?.items) ? data.items : []);

        if (resCfg.ok) {
          const cfg = await resCfg.json();
          setPostcardFooter(typeof cfg.footer === "string" ? cfg.footer : DEFAULT_NENKAI_POSTCARD_FOOTER);
        }
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
    return Array.from(map.values()).sort((a, b) =>
      compareHouseholderGojuon(a.householder, b.householder),
    );
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
          padding: 10mm 6mm 9mm 6mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          font-family: "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif;
          display: flex;
          flex-direction: row-reverse;
          align-items: flex-start;
          justify-content: flex-start;
          gap: 1.5mm;
          overflow: hidden;
        }
        .postcard > .col-title,
        .postcard > .col-intro,
        .postcard > .col-kaiki,
        .postcard > .col-footer {
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          flex-shrink: 0;
          line-height: 1.75;
        }

        /* 右端: 年号＋見出し（上寄せ） */
        .col-title {
          font-size: 14pt;
          font-weight: bold;
          letter-spacing: 0.2em;
          padding: 0 0.5mm 0 0.5mm;
          max-width: 15mm;
        }
        /* 導入文は1列にまとめる（縦に続けて折り返し） */
        .col-intro {
          font-size: 9pt;
          letter-spacing: 0.05em;
          padding: 0 0.5mm 0 0.5mm;
          max-width: 13mm;
          line-height: 1.82;
        }
        /* 回忌（ページ内で縦方向センター） */
        .col-kaiki {
          font-size: 22pt;
          font-weight: bold;
          letter-spacing: 0.14em;
          padding: 0 0.5mm;
          line-height: 1.3;
          align-self: center;
        }
        /* 故人4列ブロック（内部は横並び flex、各列のみ縦書き） */
        .detail-cluster {
          display: flex;
          flex-direction: row-reverse;
          align-items: stretch;
          flex-shrink: 0;
          height: 122mm;
          max-height: 122mm;
          gap: 1.5mm;
          writing-mode: horizontal-tb;
        }
        .detail-cluster > div {
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          font-size: 10pt;
          letter-spacing: 0.07em;
          line-height: 1.65;
        }
        .col-houmyou {
          align-self: flex-start;
          padding-top: 5mm;
          max-width: 11mm;
        }
        .col-meinichi {
          align-self: flex-start;
          padding-top: 20mm;
          max-width: 13mm;
        }
        .col-zokumei {
          align-self: flex-end;
          padding-bottom: 16mm;
          max-width: 13mm;
        }
        .col-kyounen {
          align-self: flex-end;
          padding-bottom: 16mm;
          max-width: 10mm;
        }
        /* 複数故人のときはやや詰める */
        .postcard.multi-member .detail-cluster {
          height: 108mm;
          max-height: 108mm;
        }
        .postcard.multi-member .col-kaiki {
          font-size: 18pt;
        }
        .postcard.multi-member .col-meinichi {
          padding-top: 16mm;
        }
        .postcard.multi-member .col-zokumei,
        .postcard.multi-member .col-kyounen {
          padding-bottom: 12mm;
        }
        /* 左端: 連絡（最小・上寄せ） */
        .col-footer {
          font-size: 6.5pt;
          letter-spacing: 0.02em;
          line-height: 1.6;
          padding: 0 0.5mm;
          max-width: 27mm;
          align-self: flex-start;
        }
        .col-footer .footer-contact {
          white-space: pre-line;
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
          <div
            key={gi}
            className={
              "postcard shadow border border-stone-300 print:shadow-none print:border-0" +
              (g.members.length > 1 ? " multi-member" : "")
            }
          >
            {/* 右端: タイトル */}
            <div className="col-title">
              {warekiYear}
              <br />
              ご法事のご案内
            </div>

            {/* 導入文（1列・縦書きで全文） */}
            <div className="col-intro">
              {warekiYear}の年回を左記のようにお迎えになっております。
              ご法事を営まれ、ご仏縁を結ばれますようご案内申し上げます。
            </div>

            {/* 故人ごと: 回忌（縦中央）→ 法名・命日・俗名・享年の4列 */}
            {g.members.map((m) => (
              <Fragment key={m.memberId}>
                <div className="col-kaiki">{m.kaikiLabel}</div>
                <div className="detail-cluster">
                  {m.dharmaName && <div className="col-houmyou">法名　{m.dharmaName}</div>}
                  <div className="col-meinichi">命日　{isoDateToWareki(m.deathDate)}</div>
                  <div className="col-zokumei">
                    俗名　{[m.familyName, m.givenName].filter(Boolean).join("　")}　様
                  </div>
                  {m.ageAtDeath && (
                    <div className="col-kyounen">享年　{ageToKanji(m.ageAtDeath)}歳</div>
                  )}
                </div>
              </Fragment>
            ))}

            {/* 左端: 連絡案内 */}
            <div className="col-footer">
              <div className="footer-contact">{postcardFooter}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
