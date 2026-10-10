import "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    email?: string;
    name?: string;
    /** ログイン時刻（UNIX 秒）。セッションの絶対期限の判定に使う */
    loginAt?: number;
  }
}
