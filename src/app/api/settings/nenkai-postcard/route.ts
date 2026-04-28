import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  DEFAULT_NENKAI_POSTCARD_FOOTER,
  DEFAULT_NENKAI_POSTCARD_INTRO,
} from "@/lib/nenkai-postcard-config";

const CONFIG_ID = "default";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  return null;
}

function resolveFooter(stored: string | null | undefined): string {
  if (stored === null || stored === undefined || stored.trim() === "") {
    return DEFAULT_NENKAI_POSTCARD_FOOTER;
  }
  return stored;
}

function resolveIntro(stored: string | null | undefined): string {
  if (stored === null || stored === undefined || stored.trim() === "") {
    return DEFAULT_NENKAI_POSTCARD_INTRO;
  }
  return stored;
}

function trimOrNull(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function jsonFromRow(row: Awaited<ReturnType<typeof prisma.appConfig.findUnique>>) {
  const sango = row?.nenkaiPostcardSango?.trim();
  const temple = row?.nenkaiPostcardTempleName?.trim();
  const nameFromParts = [sango, temple].filter(Boolean).join("　");
  const addrFromParts = [row?.nenkaiPostcardSenderAddressLine1, row?.nenkaiPostcardSenderAddressLine2]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("\n");
  const senderName =
    row?.nenkaiPostcardSenderName?.trim() || (nameFromParts ? nameFromParts : null);
  const senderAddress =
    row?.nenkaiPostcardSenderAddress?.trim() || (addrFromParts ? addrFromParts : null);
  return {
    senderName,
    senderAddress,
    sect: row?.nenkaiPostcardSect?.trim() || null,
    ingo: row?.nenkaiPostcardIngo?.trim() || null,
    sango: row?.nenkaiPostcardSango?.trim() || null,
    templeName: row?.nenkaiPostcardTempleName?.trim() || null,
    chiefPriest: row?.nenkaiPostcardChiefPriest?.trim() || null,
    chiefTitle: row?.nenkaiPostcardChiefTitle?.trim() || null,
    senderPostalCode: row?.nenkaiPostcardSenderPostalCode?.trim() || null,
    senderAddressLine1: row?.nenkaiPostcardSenderAddressLine1?.trim() || null,
    senderAddressLine2: row?.nenkaiPostcardSenderAddressLine2?.trim() || null,
    phone: row?.nenkaiPostcardPhone?.trim() || null,
    fax: row?.nenkaiPostcardFax?.trim() || null,
    mobile: row?.nenkaiPostcardMobile?.trim() || null,
    intro: resolveIntro(row?.nenkaiPostcardIntro),
    introIsDefault:
      row?.nenkaiPostcardIntro === null ||
      row?.nenkaiPostcardIntro === undefined ||
      (row.nenkaiPostcardIntro?.trim() ?? "") === "",
    footer: resolveFooter(row?.nenkaiPostcardFooter),
    footerIsDefault:
      row?.nenkaiPostcardFooter === null ||
      row?.nenkaiPostcardFooter === undefined ||
      (row.nenkaiPostcardFooter?.trim() ?? "") === "",
  };
}

/** ログインユーザー向け: 案内ハガキ用の差出人（表面）・連絡（裏面）設定 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
    return NextResponse.json(jsonFromRow(row));
  } catch (e) {
    console.error("[GET /api/settings/nenkai-postcard]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `読み込みに失敗しました: ${msg}` }, { status: 500 });
  }
}

/** 管理者のみ更新 */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json()) as {
    senderName?: string | null;
    senderAddress?: string | null;
    sect?: string | null;
    ingo?: string | null;
    sango?: string | null;
    templeName?: string | null;
    chiefPriest?: string | null;
    chiefTitle?: string | null;
    senderPostalCode?: string | null;
    senderAddressLine1?: string | null;
    senderAddressLine2?: string | null;
    phone?: string | null;
    fax?: string | null;
    mobile?: string | null;
    intro?: string | null;
    footer?: string | null;
  };

  const opt = (v: unknown) =>
    typeof v === "string" ? trimOrNull(v) : null;

  const senderName = opt(body.senderName);
  const senderAddress = typeof body.senderAddress === "string" ? trimOrNull(body.senderAddress) : null;

  const footerUpdate =
    body.footer === undefined
      ? {}
      : {
          nenkaiPostcardFooter:
            typeof body.footer === "string" && body.footer.trim() !== "" ? body.footer : null,
        };
  const introUpdate =
    body.intro === undefined
      ? {}
      : {
          nenkaiPostcardIntro:
            typeof body.intro === "string" && body.intro.trim() !== "" ? body.intro : null,
        };

  const sharedFields = {
    nenkaiPostcardSenderName: senderName,
    nenkaiPostcardSenderAddress: senderAddress,
    nenkaiPostcardSect: opt(body.sect),
    nenkaiPostcardIngo: opt(body.ingo),
    nenkaiPostcardSango: opt(body.sango),
    nenkaiPostcardTempleName: opt(body.templeName),
    nenkaiPostcardChiefPriest: opt(body.chiefPriest),
    nenkaiPostcardChiefTitle: opt(body.chiefTitle),
    nenkaiPostcardSenderPostalCode: opt(body.senderPostalCode),
    nenkaiPostcardSenderAddressLine1: opt(body.senderAddressLine1),
    nenkaiPostcardSenderAddressLine2: opt(body.senderAddressLine2),
    nenkaiPostcardPhone: opt(body.phone),
    nenkaiPostcardFax: opt(body.fax),
    nenkaiPostcardMobile: opt(body.mobile),
    ...introUpdate,
    ...footerUpdate,
  };

  try {
    await prisma.appConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...sharedFields },
      update: sharedFields,
    });

    const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
    return NextResponse.json(jsonFromRow(row));
  } catch (e) {
    console.error("[PUT /api/settings/nenkai-postcard]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `保存に失敗しました: ${msg}` }, { status: 500 });
  }
}
