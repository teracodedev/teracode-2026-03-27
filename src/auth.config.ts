import type { NextAuthConfig } from "next-auth";

// Edge Runtime で動作する軽量な設定（Prisma・bcrypt 不使用）
export const authConfig: NextAuthConfig = {
  trustHost: true,
  // Nginx リバースプロキシ経由で Next.js が http://localhost:3000 で動くため、
  // useSecureCookies を明示的に true にしないと __Host- プレフィックス cookie に
  // Secure フラグが付かず、ブラウザが cookie を拒否して CSRF 検証が失敗する。
  useSecureCookies: process.env.AUTH_URL?.startsWith("https:") ?? false,
  providers: [],
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
