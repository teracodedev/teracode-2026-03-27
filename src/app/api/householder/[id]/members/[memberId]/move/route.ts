/**
 * 世帯員移動 API
 * POST /api/householder/[id]/members/[memberId]/move
 * body: { targetHouseholderId: string }
 *
 * 世帯員を別の戸主配下に移動する
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; memberId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { memberId } = await params;
  const { targetHouseholderId } = await req.json();

  if (!targetHouseholderId) {
    return NextResponse.json({ error: "targetHouseholderIdは必須です" }, { status: 400 });
  }

  const [member, targetHouseholder] = await Promise.all([
    prisma.householderMember.findUnique({ where: { id: memberId } }),
    prisma.householder.findUnique({ where: { id: targetHouseholderId } }),
  ]);

  if (!member) return NextResponse.json({ error: "世帯員が見つかりません" }, { status: 404 });
  if (!targetHouseholder) return NextResponse.json({ error: "移動先の戸主が見つかりません" }, { status: 404 });
  if (member.householderId === targetHouseholderId) {
    return NextResponse.json({ error: "移動先が同じ戸主です" }, { status: 400 });
  }

  const updated = await prisma.householderMember.update({
    where: { id: memberId },
    data: { householderId: targetHouseholderId },
  });

  return NextResponse.json(updated);
}
