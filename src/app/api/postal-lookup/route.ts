import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

/** 郵便番号から住所1相当（都道府県・市区町村・町域）を返す（zipcloud プロキシ） */
export async function GET(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const raw = req.nextUrl.searchParams.get("zipcode") ?? "";
  const code = raw.replace(/-/g, "");
  if (!/^\d{7}$/.test(code)) {
    return NextResponse.json({ error: "Invalid zipcode" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    if (data.results?.length > 0) {
      const r = data.results[0];
      const address =
        ((r.address1 as string) || "") +
        ((r.address2 as string) || "") +
        ((r.address3 as string) || "");
      return NextResponse.json({ address });
    }
    return NextResponse.json({ address: null });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
