"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { compareHouseholderGojuon } from "@/lib/householder-sort";
import { westernNumeralsToKanjiDigits } from "@/lib/kanji-digits";
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

interface PostcardConfig {
  senderName: string | null;
  senderAddress: string | null;
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
}

const emptyConfig: PostcardConfig = {
  senderName: null,
  senderAddress: null,
  sect: null,
  ingo: null,
  sango: null,
  templeName: null,
  chiefPriest: null,
  chiefTitle: null,
  senderPostalCode: null,
  senderAddressLine1: null,
  senderAddressLine2: null,
  phone: null,
  fax: null,
  mobile: null,
};

export default function NenkaihyoAddressPage() {
  const sp = useSearchParams();
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1), 10);

  const [items, setItems] = useState<NenkaiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<PostcardConfig>(emptyConfig);

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
          const j = (await resCfg.json()) as PostcardConfig;
          setCfg({
            senderName: j.senderName ?? null,
            senderAddress: j.senderAddress ?? null,
            sect: j.sect ?? null,
            ingo: j.ingo ?? null,
            sango: j.sango ?? null,
            templeName: j.templeName ?? null,
            chiefPriest: j.chiefPriest ?? null,
            chiefTitle: j.chiefTitle ?? null,
            senderPostalCode: j.senderPostalCode ?? null,
            senderAddressLine1: j.senderAddressLine1 ?? null,
            senderAddressLine2: j.senderAddressLine2 ?? null,
            phone: j.phone ?? null,
            fax: j.fax ?? null,
            mobile: j.mobile ?? null,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  const householders = useMemo(() => {
    const map = new Map<string, NenkaiItem["householder"]>();
    for (const it of items) {
      if (!map.has(it.householder.id)) map.set(it.householder.id, it.householder);
    }
    return Array.from(map.values()).sort((a, b) => compareHouseholderGojuon(a, b));
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
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body > nav,
          nav.bg-stone-800,
          header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
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
          padding: 7mm 5mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          font-family: "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif;
          position: relative;
        }
        /* 宛先 郵便番号（右上・横書き・アラビア数字・官製ハガキ枠合わせ） */
        .recv-postal {
          position: absolute;
          top: 5mm;
          right: 9mm;
          font-size: 12pt;
          letter-spacing: 4.5mm;
          font-family: "Arial", "Helvetica Neue", sans-serif;
          writing-mode: horizontal-tb;
        }
        /* 宛名・住所のブロック */
        .recipient-area {
          position: absolute;
          top: 16mm;
          left: 0;
          right: 0;
          bottom: 40mm;
        }
        .recipient-area > .col {
          position: absolute;
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          top: 50%;
        }
        .recipient-area .col-address {
          right: 10mm;
          transform: translateY(-50%);
          font-size: 13pt;
          line-height: 1.55;
          letter-spacing: 0.08em;
          max-height: 90mm;
        }
        .recipient-area .col-address > div {
          white-space: nowrap;
        }
        .recipient-area .col-name {
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 20pt;
          font-weight: 500;
          letter-spacing: 0.22em;
          line-height: 1.45;
          white-space: nowrap;
        }
        .recipient-area .col-name .sama {
          margin-top: 2mm;
        }
        /* 差出人（画像レイアウト準拠：上に郵便番号、下に住所→宗派→山号寺号） */
        .sender-root {
          position: absolute;
          left: 8mm;
          bottom: 18mm;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1mm;
        }
        .sender-root .sender-cols {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 1.8mm;
        }
        .sender-root .sender-col {
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          flex-shrink: 0;
          line-height: 1.45;
          white-space: nowrap;
        }
        .sender-root .sender-zip {
          writing-mode: horizontal-tb;
          font-size: 7pt;
          letter-spacing: 0.08em;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .sender-root .sender-addr-v {
          font-size: 8pt;
          letter-spacing: 0.06em;
        }
        .sender-root .sender-sect {
          font-size: 7pt;
          letter-spacing: 0.06em;
          margin-top: 20mm;
        }
        .sender-root .sender-temple-line {
          font-size: 8pt;
          font-weight: 600;
          letter-spacing: 0.08em;
          margin-top: 22mm;
        }
        .sender-legacy {
          position: absolute;
          left: 6mm;
          bottom: 6mm;
          max-width: 34mm;
          writing-mode: vertical-rl;
          -webkit-writing-mode: vertical-rl;
          font-size: 7.5pt;
          line-height: 1.5;
          letter-spacing: 0.06em;
          color: #111;
        }
        .sender-legacy .sl-name {
          font-size: 8.5pt;
          font-weight: bold;
          margin-bottom: 1.5mm;
        }
        .sender-legacy .sl-addr {
          font-size: 7pt;
          white-space: pre-line;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">
          {year}年{month}月 宛名（表面）— {householders.length}世帯
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
          const zipDigits = (h.postalCode ?? "")
            .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
            .replace(/[^0-9]/g, "");
          const recvZip = zipDigits;
          const addrParts = [h.address1, h.address2, h.address3]
            .filter(Boolean)
            .map((p) => westernNumeralsToKanjiDigits(p!));

          const senderZipDigits = (cfg.senderPostalCode ?? "")
            .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
            .replace(/[^0-9]/g, "");
          const senderZip = senderZipDigits;
          const senderLine1 = westernNumeralsToKanjiDigits(cfg.senderAddressLine1 ?? "");
          const senderLine2 = westernNumeralsToKanjiDigits(cfg.senderAddressLine2 ?? "");
          const senderAddrVertical = [senderLine1, senderLine2].filter(Boolean).join("");
          const hasStructuredSender =
            !!senderZip ||
            !!senderAddrVertical ||
            !!(cfg.sect?.trim() || cfg.sango?.trim() || cfg.templeName?.trim());

          const sectText = cfg.sect?.trim() ?? "";

          return (
            <div
              key={h.id}
              className="postcard shadow border border-stone-300 print:shadow-none print:border-0"
            >
              {recvZip && <div className="recv-postal">{recvZip}</div>}

              <div className="recipient-area">
                <div className="col col-address">
                  {addrParts.map((part, i) => (
                    <div key={i}>{part}</div>
                  ))}
                </div>
                <div className="col col-name">
                  {h.familyName}　{h.givenName}
                  <span className="sama">　様</span>
                </div>
              </div>

              {hasStructuredSender ? (
                <div className="sender-root">
                  {senderZip && <div className="sender-zip">{senderZip}</div>}
                  <div className="sender-cols">
                    {(cfg.sango?.trim() || cfg.templeName?.trim()) && (
                      <div className="sender-col sender-temple-line">
                        {[cfg.sango?.trim(), cfg.templeName?.trim()].filter(Boolean).join("　")}
                      </div>
                    )}
                    {sectText && <div className="sender-col sender-sect">{sectText}</div>}
                    {senderAddrVertical && <div className="sender-col sender-addr-v">{senderAddrVertical}</div>}
                  </div>
                </div>
              ) : (
                (cfg.senderName?.trim() || cfg.senderAddress?.trim()) && (
                  <div className="sender-legacy">
                    {cfg.senderName?.trim() && (
                      <div className="sl-name">{westernNumeralsToKanjiDigits(cfg.senderName.trim())}</div>
                    )}
                    {cfg.senderAddress?.trim() && (
                      <div className="sl-addr">{westernNumeralsToKanjiDigits(cfg.senderAddress.trim())}</div>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
