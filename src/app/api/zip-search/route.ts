import { NextRequest, NextResponse } from "next/server";

// 都道府県ごとの郵便番号3桁プレフィックス範囲
const PREF_RANGES: Record<string, [number, number]> = {
  "北海道":   [1,   68],
  "青森県":   [30,  39],
  "岩手県":   [20,  29],
  "宮城県":   [980, 989],
  "秋田県":   [10,  19],
  "山形県":   [990, 999],
  "福島県":   [960, 979],
  "茨城県":   [300, 319],
  "栃木県":   [320, 329],
  "群馬県":   [370, 379],
  "埼玉県":   [330, 369],
  "千葉県":   [260, 299],
  "東京都":   [100, 209],
  "神奈川県": [210, 259],
  "新潟県":   [940, 959],
  "富山県":   [930, 939],
  "石川県":   [920, 929],
  "福井県":   [910, 919],
  "山梨県":   [400, 412],
  "長野県":   [380, 399],
  "岐阜県":   [500, 509],
  "静岡県":   [410, 439],
  "愛知県":   [440, 499],
  "三重県":   [510, 519],
  "滋賀県":   [520, 529],
  "京都府":   [600, 629],
  "大阪府":   [530, 599],
  "兵庫県":   [650, 679],
  "奈良県":   [630, 639],
  "和歌山県": [640, 649],
  "鳥取県":   [680, 689],
  "島根県":   [690, 699],
  "岡山県":   [700, 719],
  "広島県":   [720, 739],
  "山口県":   [740, 759],
  "徳島県":   [770, 779],
  "香川県":   [760, 769],
  "愛媛県":   [790, 799],
  "高知県":   [780, 789],
  "福岡県":   [810, 839],
  "佐賀県":   [840, 849],
  "長崎県":   [850, 859],
  "熊本県":   [860, 869],
  "大分県":   [870, 879],
  "宮崎県":   [880, 889],
  "鹿児島県": [890, 899],
  "沖縄県":   [900, 909],
};

// サーバーインメモリキャッシュ: prefix3 → {zipcode: [prefcode, city, town]}
const cache = new Map<string, Record<string, [number, string, string]>>();

async function fetchYubinbango(prefix3: string): Promise<Record<string, [number, string, string]>> {
  if (cache.has(prefix3)) return cache.get(prefix3)!;
  try {
    const res = await fetch(
      `https://yubinbango.github.io/yubinbango-data/data/${prefix3}.js`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) { cache.set(prefix3, {}); return {}; }
    const text = await res.text();
    const match = text.match(/\$yubin\((\{[\s\S]*\})\)/);
    if (!match) { cache.set(prefix3, {}); return {}; }
    const data: Record<string, [number, string, string]> = JSON.parse(match[1]);
    cache.set(prefix3, data);
    return data;
  } catch {
    cache.set(prefix3, {});
    return {};
  }
}

export async function GET(req: NextRequest) {
  const pref = req.nextUrl.searchParams.get("pref") ?? "";
  const city = req.nextUrl.searchParams.get("city") ?? "";
  if (!pref || !city) return NextResponse.json([]);

  const range = PREF_RANGES[pref];
  if (!range) return NextResponse.json([]);

  const [start, end] = range;
  const prefixes: string[] = [];
  for (let i = start; i <= end; i++) {
    prefixes.push(String(i).padStart(3, "0"));
  }

  // 並列フェッチ
  const allData = await Promise.all(prefixes.map(fetchYubinbango));

  // cityに一致するエントリを収集
  const results: { town: string; zipcode: string }[] = [];
  for (const data of allData) {
    for (const [zipcode, entry] of Object.entries(data)) {
      if (entry[1] === city && entry[2]) {
        const zip = zipcode.replace(/^(\d{3})(\d{4})$/, "$1-$2");
        results.push({ town: entry[2], zipcode: zip });
      }
    }
  }

  // 重複除去（同一町域名が複数ある場合は最初の郵便番号を使う）
  const seen = new Set<string>();
  const unique = results.filter(r => {
    if (seen.has(r.town)) return false;
    seen.add(r.town);
    return true;
  });

  return NextResponse.json(unique.sort((a, b) => a.town.localeCompare(b.town, "ja")));
}
