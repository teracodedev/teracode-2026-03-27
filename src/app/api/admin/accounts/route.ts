import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/credentials";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string" ||
    !email.trim() ||
    !password ||
    !name.trim()
  ) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(trimmedEmail)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `名前は${MAX_NAME_LENGTH}文字以内にしてください` }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` }, { status: 400 });
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `パスワードは${MAX_PASSWORD_LENGTH}文字以内にしてください` }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: trimmedEmail, password: hashed, name: trimmedName, isAdmin: isAdmin === true },
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return apiErrorResponse("POST /api/admin/accounts", e, "登録に失敗しました");
  }
}
