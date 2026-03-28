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

  const [allData, setAllData] = useState<Record<string, string[]> | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const [pref, setPref] = useState("");
  const [cities, setCities] = useState<string[]>([]);

  const [city, setCity] = useState("");
  const [towns, setTowns] = useState<ZipcodeResult[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);

  const selectCls = size === "sm"
    ? "w-full border border-stone-300 rounded px-2 py-1.5 text-sm bg-white"
    : "w-full border border-stone-300 rounded-lg px-3 py-2 text-base bg-white";

  // パネルを開いたときに全市区町村データを1回だけ取得
  const loadAllData = async () => {
    if (allData) return allData;
    setLoadingAll(true);
    try {
      const res = await fetch("https://geolonia.github.io/japanese-addresses/api/ja.json");
      const data: Record<string, string[]> = await res.json();
      setAllData(data);
      setLoadingAll(false);
      return data;
    } catch { /* 無視 */ }
    setLoadingAll(false);
    return null;
  };

  const handlePrefChange = async (selected: string) => {
    setPref(selected);
    setCity(""); setCities([]);
    setTowns([]);
    if (!selected) return;
    const data = await loadAllData();
    if (data && data[selected]) {
      setCities(data[selected]);
    }
  };

  const handleCityChange = async (selected: string) => {
    setCity(selected);
    setTowns([]);
    if (!selected) return;
    setLoadingTowns(true);
    try {
      const query = encodeURIComponent(pref + selected);
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?address=${query}&limit=100`
      );
      const data = await res.json();
      setTowns(data.results || []);
    } catch { /* 無視 */ }
    setLoadingTowns(false);
  };

  const handleTownChange = (idx: string) => {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const r = towns[i];
    const zip = r.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2");
    onSelect(zip, r.address1 + r.address2 + (r.address3 || ""));
    setOpen(false);
  };

  const reset = () => {
    setOpen(false);
    setPref(""); setCity("");
    setCities([]); setTowns([]);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); loadAllData(); }}
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
        <button type="button" onClick={reset} className="text-xs text-stone-400 hover:text-stone-600">
          閉じる
        </button>
      </div>

      {/* Step 1: 都道府県 */}
      <select value={pref} onChange={e => handlePrefChange(e.target.value)} className={selectCls}>
        <option value="">① 都道府県を選択</option>
        {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Step 2: 市区町村（都道府県選択後に表示） */}
      {pref && (
        loadingAll ? (
          <p className="text-xs text-stone-400 pl-1">市区町村を読み込み中…</p>
        ) : (
          <select value={city} onChange={e => handleCityChange(e.target.value)} className={selectCls}>
            <option value="">② 市区町村を選択</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )
      )}

      {/* Step 3: 町域（市区町村選択後に表示） */}
      {city && (
        loadingTowns ? (
          <p className="text-xs text-stone-400 pl-1">町域を読み込み中…</p>
        ) : towns.length === 0 ? (
          <p className="text-xs text-stone-400 pl-1">該当する町域が見つかりませんでした</p>
        ) : (
          <select defaultValue="" onChange={e => handleTownChange(e.target.value)} className={selectCls}>
            <option value="" disabled>③ 町域を選択（郵便番号が自動入力されます）</option>
            {towns.map((r, i) => (
              <option key={i} value={i}>
                {r.address3 || "（町域なし）"}　〒{r.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2")}
              </option>
            ))}
          </select>
        )
      )}
    </div>
  );
}
