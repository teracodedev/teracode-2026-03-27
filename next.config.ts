import type { NextConfig } from "next";

// deploy.sh が SKIP_TYPECHECK=1 を付けると、next build の型チェックを省略して短縮する
const skipTypecheck =
  process.env.SKIP_TYPECHECK === "1" ||
  process.env.SKIP_TYPECHECK?.toLowerCase() === "true";

const nextConfig: NextConfig = {
  // 本番は自己完結サーバーにすると静的ファイル配信が安定しやすい（next start で /_next/static が 500 になる環境の回避）
  output: "standalone",
  // Prisma は Turbopack/Route Handler でバンドルすると実行時に壊れることがあるため外部化する
  serverExternalPackages: ["@prisma/client", "prisma"],
  // デプロイ時間短縮: ファイルトレースからテスト/ドキュメント類を除外
  outputFileTracingExcludes: {
    "/*": [
      "**/node_modules/**/test/**",
      "**/node_modules/**/tests/**",
      "**/node_modules/**/__tests__/**",
      "**/node_modules/**/docs/**",
      "**/node_modules/**/examples/**",
      "**/node_modules/**/*.md",
    ],
  },
  experimental: {
    serverSourceMaps: false,
  },
  ...(skipTypecheck && {
    typescript: {
      // デプロイ時のみ。型チェックは npm run typecheck / ローカルの通常ビルドで行う
      ignoreBuildErrors: true,
    },
  }),
  // Next.js 16 では `next.config.ts` の `eslint` オプション（ignoreDuringBuilds 等）は非対応。
  // そのため build 時の lint 無効化は設定ではなく、Next.js 側の挙動（ビルドで lint しない）に委ねる。

  // ハッシュ付きアセットのみ長期キャッシュ（HTML の no-store は nginx 側で付与）
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
