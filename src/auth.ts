import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        console.log("[authorize] called, email:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[authorize] missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          console.log("[authorize] user found:", !!user, "hash prefix:", user?.password?.substring(0, 7));

          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          console.log("[authorize] password valid:", isValid);
          if (!isValid) return null;

          return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
        } catch (err) {
          console.error("[authorize] error:", err);
          return null;
        }
      },
    }),
  ],
});
