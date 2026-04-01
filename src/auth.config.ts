import type { NextAuthConfig } from "next-auth";

// __Host- プレフィックスなしの cookie 名を使用。
// __Host- は Secure フラグ必須だが、Nginx リバースプロキシ経由だと
// Next.js が http://localhost:3000 で動作しているため Secure フラグが
// 付かず、ブラウザが cookie を拒否して CSRF 検証が常に失敗する。
const useSecure = process.env.AUTH_URL?.startsWith("https:") ?? false;

// Edge Runtime で動作する軽量な設定（Prisma・bcrypt 不使用）
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecure },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecure },
    },
    callbackUrl: {
      name: "authjs.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecure },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
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
  session: { strategy: "jwt" },
};
