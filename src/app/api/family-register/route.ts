import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
<<<<<<< HEAD
import { hiraganaToKatakana } from "@/lib/kana";
=======
import { toFullWidthKatakana } from "@/lib/yaml-utils";
>>>>>>> 793ba5f (temp)

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
<<<<<<< HEAD
  const qKana = hiraganaToKatakana(q);
=======
  const qKana = toFullWidthKatakana(q) || q;
>>>>>>> 793ba5f (temp)

  try {
    const registers = await prisma.familyRegister.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { householders: { some: { OR: [
                { familyName: { contains: q } },
                { givenName:  { contains: q } },
<<<<<<< HEAD
                { familyNameKana: { contains: qKana } },
                { givenNameKana:  { contains: qKana } },
=======
                { familyNameKana: { contains: qKana, mode: "insensitive" } },
                { givenNameKana:  { contains: qKana, mode: "insensitive" } },
>>>>>>> 793ba5f (temp)
              ] } } },
            ],
          }
        : undefined,
      include: {
        householders: {
          select: { id: true, familyName: true, givenName: true, familyNameKana: true, givenNameKana: true, isActive: true, address1: true, phone1: true, _count: { select: { members: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(registers);
  } catch (e) {
    console.error("GET /api/family-register error:", e);
    return NextResponse.json({ error: "データ取得エラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { name, note } = await req.json();
  if (!name) return NextResponse.json({ error: "台帳名は必須です" }, { status: 400 });

  const register = await prisma.familyRegister.create({ data: { name, note: note || null } });
  return NextResponse.json(register, { status: 201 });
}
