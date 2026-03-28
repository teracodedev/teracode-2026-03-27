"use client";
import { useState } from "react";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

interface ZipcodeResult {
  zipcode: string;
  address1: string;
  address2: string;
  address3: string;
}

interface Props {
  onSelect: (postalCode: string, address: string) => void;
  size?: "sm" | "base";
}

export function PostalCodeSearch({ onSelect, size = "base" }: Props) {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ZipcodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const inputCls = size === "sm"
    ? "border border-stone-300 rounded px-2 py-1.5 text-sm"
    : "border border-stone-300 rounded-lg px-3 py-2 text-base";

  const search = async () => {
    if (!pref) return;
    setSearching(true);
    setSearched(false);
    setResults([]);
    try {
      const query = encodeURIComponent(pref + city);
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?address=${query}&limit=100`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { /* 無視 */ }
    setSearched(true);
    setSearching(false);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const r = results[idx];
    const address = r.address1 + r.address2 + (r.address3 || "");
    const zip = r.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2");
    onSelect(zip, address);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-stone-600 underline mt-1 block"
      >
        住所から郵便番号を検索
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-stone-600">住所から郵便番号を検索</span>
        <button
          type="button"
          onClick={() => { setOpen(false); setResults([]); setSearched(false); }}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          閉じる
        </button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={pref}
          onChange={e => { setPref(e.target.value); setResults([]); setSearched(false); }}
          className={inputCls}
        >
          <option value="">都道府県</option>
          {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="市区町村（例：渋谷区）"
          className={`flex-1 min-w-0 ${inputCls}`}
        />
        <button
          type="button"
          onClick={search}
          disabled={!pref || searching}
          className="border border-stone-300 text-stone-600 px-3 py-1.5 rounded text-sm hover:bg-stone-100 disabled:opacity-40 whitespace-nowrap"
        >
          {searching ? "検索中…" : "検索"}
        </button>
      </div>
      {searched && results.length === 0 && (
        <p className="text-xs text-stone-400">該当する住所が見つかりませんでした</p>
      )}
      {results.length > 0 && (
        <select
          onChange={handleSelect}
          defaultValue=""
          className={`w-full ${inputCls}`}
        >
          <option value="" disabled>町域を選択してください</option>
          {results.map((r, i) => (
            <option key={i} value={i}>
              〒{r.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2")}　{r.address2}{r.address3 ? `　${r.address3}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
