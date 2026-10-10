import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { verifyCredentials } from "@/lib/credentials";
import { getClientIp } from "@/lib/login-throttle";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials, request) {
        const result = await verifyCredentials(
          credentials?.email,
          credentials?.password,
          getClientIp(request.headers)
        );
        return result.status === "ok" ? result.user : null;
      },
    }),
  ],
});
