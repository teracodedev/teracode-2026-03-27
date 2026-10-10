import Link from "next/link";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { LoginForm, type LoginErrorKind } from "./login-form";

function normalizeError(raw: string | string[] | undefined): LoginErrorKind | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "credentials" || v === "rate_limited" ? v : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const callbackUrl = safeCallbackPath(sp.callbackUrl);
  const error = normalizeError(sp.error);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2" suppressHydrationWarning>
            ⛩
          </div>
          <h1 className="text-2xl font-bold text-stone-800">テラコード</h1>
          <p className="text-stone-500 text-sm mt-1">寺院管理システム</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-stone-700 mb-6">ログイン</h2>
          <LoginForm callbackUrl={callbackUrl} error={error} />
          <p className="mt-6 text-center text-sm text-stone-500">
            <Link href="/" className="text-stone-600 hover:text-stone-800 underline">
              トップへ戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
