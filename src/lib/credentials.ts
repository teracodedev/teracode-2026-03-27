import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clearAccountFailures, isLoginThrottled, recordLoginFailure } from "@/lib/login-throttle";

/** 存在しないアカウントでも同じコスト（12）で照合し、応答時間からアカウントの有無を推測させない */
const DUMMY_PASSWORD_HASH = "$2b$12$V1Cgrm7BvoIVrjYOAL.8PusUQZ88rg3s.nb0fR6SZSAM52AT0VUz2";

export const MAX_EMAIL_LENGTH = 254;
export const MAX_PASSWORD_LENGTH = 256;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export type CredentialResult =
  | { status: "ok"; user: AuthenticatedUser }
  | { status: "invalid" }
  | { status: "throttled" };

/**
 * メールアドレス・パスワードを検証する。/api/login と NextAuth の Credentials プロバイダの両方から使い、
 * どちらの経路でも同じ試行回数制限がかかるようにする。
 */
export async function verifyCredentials(
  email: unknown,
  password: unknown,
  ip: string
): Promise<CredentialResult> {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password ||
    email.length > MAX_EMAIL_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return { status: "invalid" };
  }

  if (isLoginThrottled(ip, email)) {
    console.warn("[login] too many failed attempts (rejected)", { ip });
    return { status: "throttled" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
  if (!user || !isValid) {
    recordLoginFailure(ip, email);
    return { status: "invalid" };
  }

  clearAccountFailures(email);
  return {
    status: "ok",
    user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
  };
}
