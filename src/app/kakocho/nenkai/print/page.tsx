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

// 西暦 → 和暦(令和)文字列。令和元年=2019。それ以前は西暦表記でフォールバック。
function toWareki(y: number): string {
  if (y >= 2019) {
    const n = y - 2018;
    const kanjiNums = ["", "元", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
    const label = n === 1 ? "元" : (kanjiNums[n] ?? String(n));
    return "令和" + label + "年";
  }
  return y + "年";
}

function formatMD(iso: string): string {
  const d = new Date(iso);
  return (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

export default function NenkaiPrintPage() {
  const sp = useSearchParams();
  const year  = parseInt(sp.get("year")  ?? String(new Date().getFullYear()), 10);
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

  // 戸主単位にグループ化
  const grouped = useMemo(() => {
    const map = new Map<string, { householder: NenkaiItem["householder"]; members: NenkaiItem[] }>();
    for (const it of items) {
      const key = it.householder.id;
      const cur = map.get(key);
      if (cur) cur.members.push(it);
      else map.set(key, { householder: it.householder, members: [it] });
    }
    for (const g of map.values()) {
      g.members.sort((a, b) => new Date(a.deathDate).getDate() - new Date(b.deathDate).getDate());
    }
    return Array.from(map.values()).sort((a, b) => {
      const ka = (a.householder.familyNameKana ?? "") + (a.householder.givenNameKana ?? "");
      const kb = (b.householder.familyNameKana ?? "") + (b.householder.givenNameKana ?? "");
      return ka.localeCompare(kb, "ja");
    });
  }, [items]);

  const wareki = toWareki(year);

  if (loading) return <div className="p-8 text-stone-500">読み込み中...</div>;

  return (
    <>
      <style jsx global>{`
        @page {
          size: 100mm 148mm;
          margin: 0;
        }
        @media print {
          html, body { background: #fff; }
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
          padding: 6mm 6mm 6mm 6mm;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          font-family: "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <div className="no-print bg-stone-100 p-4 flex items-center gap-3 sticky top-0 z-10 border-b border-stone-200">
        <div className="text-sm text-stone-600">
          {year}年{month}月の年回案内 — {grouped.length}世帯 / {items.length}名
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium"
        >
          印刷
        </button>
      </div>

      <div className="bg-stone-200 p-4 print:p-0 print:bg-white flex flex-col items-center gap-4 print:gap-0">
        {grouped.length === 0 && (
          <div className="no-print text-stone-500 py-12">該当する年回はありません</div>
        )}
        {grouped.map((g, gi) => {
          const addr = [g.householder.address1, g.householder.address2, g.householder.address3].filter(Boolean).join("");
          return (
            <div key={gi} className="postcard shadow border border-stone-300 print:shadow-none print:border-0">
              <div className="text-center text-base font-bold tracking-widest mb-2">ご法事のご案内</div>

              <div className="text-[10pt] leading-snug mb-2">
                {wareki}の年回を下記のようにお迎えになっておられます。
                故人を偲び、謹んでご法事をお勤めいただきますようご案内申し上げます。
              </div>

              <div className="border-t border-b border-stone-700 py-2 my-2">
                <table className="w-full text-[9.5pt]">
                  <tbody>
                    {g.members.map((m) => (
                      <tr key={m.memberId} className="align-top">
                        <td className="pr-1 whitespace-nowrap">{m.kaikiLabel}</td>
                        <td className="pr-1 whitespace-nowrap">{formatMD(m.deathDate)}</td>
                        <td className="pr-1">
                          <div>{[m.familyName, m.givenName].filter(Boolean).join(" ")}{m.ageAtDeath ? "（享年" + m.ageAtDeath + "）" : ""}</div>
                          {m.dharmaName && <div className="text-[8.5pt]">{m.dharmaName}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[8.5pt] leading-snug">
                ご法事を営まれ、ご仏縁をお結びくださいますようご案内申し上げます。
                ご都合のよい日時をお早めにご連絡ください。
              </div>

              <div className="mt-auto pt-2 text-[9pt]">
                {addr && (
                  <div className="text-stone-700">
                    {g.householder.postalCode && <span className="mr-1">〒{g.householder.postalCode}</span>}
                    {addr}
                  </div>
                )}
                <div className="font-medium">
                  {g.householder.familyName} {g.householder.givenName} 様
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
