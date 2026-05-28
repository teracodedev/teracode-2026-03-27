import Link from "next/link";

export default function AddressPrintPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">宛名類の印刷</h1>
        <p className="text-stone-500 text-sm mt-1">
          封筒・ラベルなど宛名書類を印刷します。
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-stone-600 mb-3">
          宛名印刷は「タグで抽出して印刷」から実行できます。
        </p>
        <Link
          href="/print/address/tag"
          className="inline-block px-4 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 text-sm font-medium"
        >
          タグで抽出して印刷を開く
        </Link>
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
