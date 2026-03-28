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
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [city, setCity] = useState("");

  const [towns, setTowns] = useState<ZipcodeResult[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [town, setTown] = useState("");

  const inputCls = size === "sm"
    ? "border border-stone-300 rounded px-2 py-1.5 text-sm bg-white w-full"
    : "border border-stone-300 rounded-lg px-3 py-2 text-base bg-white w-full";

  const handlePrefChange = async (selected: string) => {
    setPref(selected);
    setCity(""); setCities([]);
    setTown(""); setTowns([]);
    if (!selected) return;
    setLoadingCities(true);
    try {
      const res = await fetch(
        `https://geolonia.github.io/japanese-addresses/api/ja/${encodeURIComponent(selected)}.json`
      );
      const data = await res.json();
      setCities(Object.keys(data).sort());
    } catch { /* 無視 */ }
    setLoadingCities(false);
  };

  const fetchTowns = async (cityValue: string) => {
    if (!pref || !cityValue) return;
    setTown(""); setTowns([]);
    setLoadingTowns(true);
    try {
      const query = encodeURIComponent(pref + cityValue);
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?address=${query}&limit=100`
      );
      const data = await res.json();
      setTowns(data.results || []);
    } catch { /* 無視 */ }
    setLoadingTowns(false);
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setTown(""); setTowns([]);
    // 候補リストから選択されたとき（完全一致）は即座に町域を取得
    if (cities.includes(value)) fetchTowns(value);
  };

  const handleTownChange = (value: string) => {
    setTown(value);
    const match = towns.find(r => r.address3 === value);
    if (match) {
      const zip = match.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2");
      onSelect(zip, match.address1 + match.address2 + (match.address3 || ""));
      setOpen(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setPref(""); setCity(""); setTown("");
    setCities([]); setTowns([]);
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
        <button type="button" onClick={reset} className="text-xs text-stone-400 hover:text-stone-600">
          閉じる
        </button>
      </div>

      {/* 都道府県 */}
      <select
        value={pref}
        onChange={e => handlePrefChange(e.target.value)}
        className={inputCls}
      >
        <option value="">都道府県を選択</option>
        {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* 市区町村：datalist でドロップダウン選択 + 自由入力の両方に対応 */}
      {pref && (
        loadingCities ? (
          <p className="text-xs text-stone-400">市区町村を読み込み中…</p>
        ) : (
          <div className="flex gap-2">
            <input
              list="postal-search-cities"
              value={city}
              onChange={e => handleCityChange(e.target.value)}
              placeholder="市区町村（選択または入力）"
              className={inputCls}
            />
            <datalist id="postal-search-cities">
              {cities.map(c => <option key={c} value={c} />)}
            </datalist>
            {/* 自由入力時は候補一致しないため手動で検索 */}
            {city && !cities.includes(city) && (
              <button
                type="button"
                onClick={() => fetchTowns(city)}
                disabled={loadingTowns}
                className="border border-stone-300 text-stone-600 px-3 py-1.5 rounded text-sm hover:bg-stone-100 disabled:opacity-40 whitespace-nowrap"
              >
                検索
              </button>
            )}
          </div>
        )
      )}

      {/* 町域：datalist でドロップダウン選択 + 自由入力の両方に対応 */}
      {city && (
        loadingTowns ? (
          <p className="text-xs text-stone-400">町域を読み込み中…</p>
        ) : towns.length > 0 ? (
          <div>
            <input
              list="postal-search-towns"
              value={town}
              onChange={e => handleTownChange(e.target.value)}
              placeholder="町域を選択または入力すると郵便番号が入ります"
              className={inputCls}
            />
            <datalist id="postal-search-towns">
              {towns.map((r, i) => (
                <option key={i} value={r.address3 || ""}>
                  〒{r.zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2")}
                </option>
              ))}
            </datalist>
          </div>
        ) : city && towns.length === 0 && !loadingTowns && cities.includes(city) ? (
          <p className="text-xs text-stone-400">該当する町域が見つかりませんでした</p>
        ) : null
      )}
    </div>
  );
}
