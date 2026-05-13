import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// タグ一覧取得
export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { householderTags: true, memberTags: true } },
    },
  });
  return NextResponse.json(tags);
}

// タグ作成
export async function POST(request: NextRequest) {
  const { name, color } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.create({
      data: { name: name.trim(), color: color || "#6b7280" },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
    }
    throw e;
  }
}
