import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/require-auth";

const prisma = new PrismaClient();

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { email, password, name, isAdmin } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "パスワードは8文字以上にしてください" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, isAdmin: isAdmin ?? false },
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
