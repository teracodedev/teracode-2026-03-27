import type { NextAuthConfig } from "next-auth";
import {
  SESSION_ABSOLUTE_TIMEOUT_SEC,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SEC,
  USE_SECURE_COOKIES,
} from "@/lib/session-config";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: USE_SECURE_COOKIES,
};

// Edge Runtime で動作する軽量な設定（Prisma・bcrypt 不使用）
export const authConfig: NextAuthConfig = {
  trustHost: true,
  // __Host- / __Secure- プレフィックス cookie がリバースプロキシ経由で保存されないブラウザがあるため
  // useSecureCookies は false（プレフィックスなしの名前）にし、Secure 属性は下の cookies で個別に付与する。
  useSecureCookies: false,
  cookies: {
    sessionToken: { name: SESSION_COOKIE_NAME, options: cookieOptions },
    callbackUrl: { name: "authjs.callback-url", options: cookieOptions },
    csrfToken: { name: "authjs.csrf-token", options: cookieOptions },
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.loginAt = now;
      }
      // loginAt を持たない（この期限管理の導入前に発行された）トークンも破棄して再ログインさせる
      if (typeof token.loginAt !== "number" || now - token.loginAt > SESSION_ABSOLUTE_TIMEOUT_SEC) {
        return null;
      }
      return token;
    },
    session({ session, token }) {
      if (!session.user) {
        session.user = {
          id: "",
          email: "",
          name: "",
          isAdmin: false,
          emailVerified: null,
        };
      }
      session.user.id = (token.id as string | undefined) ?? "";
      session.user.isAdmin = Boolean(token.isAdmin);
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.name === "string") session.user.name = token.name;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: SESSION_IDLE_TIMEOUT_SEC },
};
