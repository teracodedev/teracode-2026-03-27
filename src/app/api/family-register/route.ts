import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { toFullWidthKatakana } from "@/lib/yaml-utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const qKana = toFullWidthKatakana(q) || q;

  // フルネーム検索用の AND 条件（例: "青井秀夫" → 姓+名の組み合わせ）
  const fullNameOrConditions: object[] = [];
  if (q.length >= 2) {
    const parts = q.split(/[\s　]+/).filter(Boolean);
    const kParts = qKana.split(/[\s　]+/).filter(Boolean);
    if (parts.length >= 2) {
      fullNameOrConditions.push(
        { AND: [{ familyName: { contains: parts[0], mode: "insensitive" } }, { givenName: { contains: parts[1], mode: "insensitive" } }] },
      );
      if (kParts.length >= 2) {
        fullNameOrConditions.push(
          { AND: [{ familyNameKana: { contains: kParts[0], mode: "insensitive" } }, { givenNameKana: { contains: kParts[1], mode: "insensitive" } }] },
        );
      }
    } else {
      for (let i = 1; i < q.length; i++) {
        fullNameOrConditions.push(
          { AND: [{ familyName: { contains: q.slice(0, i), mode: "insensitive" } }, { givenName: { contains: q.slice(i), mode: "insensitive" } }] },
        );
      }
    }
  }

  try {
    const registers = await prisma.familyRegister.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { householders: { is: { OR: [
                { familyName: { contains: q } },
                { givenName:  { contains: q } },
                { familyNameKana: { contains: qKana, mode: "insensitive" } },
                { givenNameKana:  { contains: qKana, mode: "insensitive" } },
                ...fullNameOrConditions,
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
