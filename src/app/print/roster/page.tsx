import Link from "next/link";

export default function RosterPrintPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">名簿類の印刷</h1>
        <p className="text-stone-500 text-sm mt-1">
          戸主・家族・親族などの名簿を印刷します。
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-stone-600">準備中です。</p>
      </div>
      <div>
        <Link
          href="/print"
          className="text-sm font-medium text-amber-700 hover:text-amber-600"
        >
          ← 各種印刷へ戻る
        </Link>
      </div>
    </div>
  );
}
