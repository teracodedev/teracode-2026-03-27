import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/auth";
import { DEFAULT_NENKAI_POSTCARD_FOOTER } from "@/lib/nenkai-postcard-config";

const prisma = new PrismaClient();

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

/** ログインユーザー向け: 案内ハガキ用の差出人・連絡設定 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
  return NextResponse.json({
    senderName: row?.nenkaiPostcardSenderName?.trim() || null,
    senderAddress: row?.nenkaiPostcardSenderAddress?.trim() || null,
    footer: resolveFooter(row?.nenkaiPostcardFooter),
    footerIsDefault:
      row?.nenkaiPostcardFooter === null ||
      row?.nenkaiPostcardFooter === undefined ||
      row.nenkaiPostcardFooter.trim() === "",
  });
}

/** 管理者のみ更新 */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json()) as {
    senderName?: string | null;
    senderAddress?: string | null;
    footer?: string | null;
  };

  const senderName =
    typeof body.senderName === "string" ? body.senderName.trim() || null : null;
  const senderAddress =
    typeof body.senderAddress === "string" ? body.senderAddress.trim() || null : null;
  let footer: string | null = null;
  if (typeof body.footer === "string") {
    const t = body.footer.trim();
    footer = t === "" ? null : body.footer;
  }

  await prisma.appConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      nenkaiPostcardSenderName: senderName,
      nenkaiPostcardSenderAddress: senderAddress,
      nenkaiPostcardFooter: footer,
    },
    update: {
      nenkaiPostcardSenderName: senderName,
      nenkaiPostcardSenderAddress: senderAddress,
      nenkaiPostcardFooter: footer,
    },
  });

  const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
  return NextResponse.json({
    senderName: row?.nenkaiPostcardSenderName?.trim() || null,
    senderAddress: row?.nenkaiPostcardSenderAddress?.trim() || null,
    footer: resolveFooter(row?.nenkaiPostcardFooter),
    footerIsDefault:
      row?.nenkaiPostcardFooter === null ||
      row?.nenkaiPostcardFooter === undefined ||
      row.nenkaiPostcardFooter.trim() === "",
  });
}
