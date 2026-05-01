"use client";

import { useState, useRef } from "react";

type HouseholderImportResult = {
  householders: number;
  members: number;
  errors: number;
  errorDetails: string[];
  debug?: {
    householderAnnaiFuyoCol: string | null;
    familyAnnaiFuyoCol: string | null;
    familyColumns: string[];
    householderColumns: string[];
  };
};

type GraveImportResult = {
  graves: number;
  contracts: number;
  histories?: number;
  errors: number;
  errorDetails: string[];
};

export default function MdbImportPage() {
  // 戸主・家族 MDB
  const [householderFile, setHouseholderFile] = useState<File | null>(null);
  const [householderLoading, setHouseholderLoading] = useState(false);
  const [householderResult, setHouseholderResult] = useState<HouseholderImportResult | null>(null);
  const [householderError, setHouseholderError] = useState("");
  const householderFileRef = useRef<HTMLInputElement>(null);

  // 墓地 MDB
  const [graveFile, setGraveFile] = useState<File | null>(null);
  const [graveLoading, setGraveLoading] = useState(false);
  const [graveResult, setGraveResult] = useState<GraveImportResult | null>(null);
  const [graveError, setGraveError] = useState("");
  const graveFileRef = useRef<HTMLInputElement>(null);

  const handleHouseholderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setHouseholderFile(f);
    setHouseholderResult(null);
    setHouseholderError("");
  };

  const handleHouseholderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householderFile) return;

    setHouseholderLoading(true);
    setHouseholderResult(null);
    setHouseholderError("");

    const formData = new FormData();
    formData.append("file", householderFile);

    try {
      const res = await fetch("/api/import/mdb", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setHouseholderError(data.error || "インポートに失敗しました");
      } else {
        setHouseholderResult(data as HouseholderImportResult);
      }
    } catch {
      setHouseholderError("通信エラーが発生しました");
    } finally {
      setHouseholderLoading(false);
    }
  };

  const handleHouseholderReset = () => {
    setHouseholderFile(null);
    setHouseholderResult(null);
    setHouseholderError("");
    if (householderFileRef.current) householderFileRef.current.value = "";
  };

  const handleGraveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setGraveFile(f);
    setGraveResult(null);
    setGraveError("");
  };

  const handleGraveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!graveFile) return;

    setGraveLoading(true);
    setGraveResult(null);
    setGraveError("");

    const formData = new FormData();
    formData.append("file", graveFile);

    try {
      const res = await fetch("/api/import/grave-mdb", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setGraveError(data.error || "インポートに失敗しました");
      } else {
        setGraveResult(data as GraveImportResult);
      }
    } catch {
      setGraveError("通信エラーが発生しました");
    } finally {
      setGraveLoading(false);
    }
  };

  const handleGraveReset = () => {
    setGraveFile(null);
    setGraveResult(null);
    setGraveError("");
    if (graveFileRef.current) graveFileRef.current.value = "";
  };

  return (
    <div className="space-y-12 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">データインポート</h1>
        <p className="text-stone-500 text-sm mt-1">
          寺院管理ソフト（J2善法寺など）の .mdb ファイルから戸主・家族・墓地データを一括インポートします。
        </p>
      </div>

      {/* 戸主・家族 MDB インポート */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800">戸主・家族データ</h2>
          <p className="text-stone-500 text-sm mt-1">
            戸主台帳および家族員データをインポートします。
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
          <p className="font-medium">インポート前にご確認ください</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>既存データは全て削除され、インポートデータで上書きされます。</li>
            <li>対象テーブル: UTB001_戸主（戸主台帳）・UTB002_家族（家族員）</li>
            <li>大量データのインポートには数分かかる場合があります。</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-700">MDBファイルを選択</h3>
          </div>
          <form onSubmit={handleHouseholderSubmit} className="p-6 space-y-4">
            <div
              className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-stone-400 transition-colors"
              onClick={() => householderFileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📂</div>
              {householderFile ? (
                <div>
                  <p className="font-medium text-stone-700">{householderFile.name}</p>
                  <p className="text-sm text-stone-400 mt-1">
                    {(householderFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-stone-500">クリックして .mdb ファイルを選択</p>
                  <p className="text-sm text-stone-400 mt-1">
                    Microsoft Access データベースファイル (.mdb)
                  </p>
                </div>
              )}
              <input
                ref={householderFileRef}
                type="file"
                accept=".mdb,.accdb"
                onChange={handleHouseholderFileChange}
                className="hidden"
              />
            </div>

            {householderError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {householderError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              {(householderFile || householderResult) && (
                <button
                  type="button"
                  onClick={handleHouseholderReset}
                  className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  リセット
                </button>
              )}
              <button
                type="submit"
                disabled={!householderFile || householderLoading}
                className="bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {householderLoading ? "インポート中..." : "インポート開始"}
              </button>
            </div>
          </form>
        </div>

        {householderLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin" />
            </div>
            <p className="text-stone-600 text-sm">
              データをインポートしています。しばらくお待ちください...
            </p>
          </div>
        )}

        {householderResult && !householderLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700">インポート結果</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{householderResult.householders}</div>
                  <div className="text-sm text-green-600 mt-1">戸主</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{householderResult.members}</div>
                  <div className="text-sm text-blue-600 mt-1">家族員</div>
                </div>
                <div className={`border rounded-lg p-4 text-center ${householderResult.errors > 0 ? "bg-red-50 border-red-200" : "bg-stone-50 border-stone-200"}`}>
                  <div className={`text-3xl font-bold ${householderResult.errors > 0 ? "text-red-700" : "text-stone-400"}`}>
                    {householderResult.errors}
                  </div>
                  <div className={`text-sm mt-1 ${householderResult.errors > 0 ? "text-red-600" : "text-stone-400"}`}>
                    エラー
                  </div>
                </div>
              </div>

              {householderResult.errors === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  インポートが完了しました。戸主 {householderResult.householders} 件・家族員 {householderResult.members} 件を登録しました。
                </div>
              )}

              {householderResult.debug && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-stone-500">案内不要 列検出:</p>
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs font-mono text-stone-600 space-y-0.5">
                    <p>家族テーブル: {householderResult.debug.familyAnnaiFuyoCol ?? "（見つかりません）"}</p>
                    <p>戸主テーブル: {householderResult.debug.householderAnnaiFuyoCol ?? "（見つかりません）"}</p>
                    {!householderResult.debug.familyAnnaiFuyoCol && householderResult.debug.familyColumns.length > 0 && (
                      <p className="text-stone-400">家族列一覧: {householderResult.debug.familyColumns.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}

              {householderResult.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">エラー詳細（最大50件）:</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto">
                    {householderResult.errorDetails.map((msg, i) => (
                      <p key={i} className="text-xs text-red-700 font-mono">{msg}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 墓地 MDB インポート */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800">墓地データ</h2>
          <p className="text-stone-500 text-sm mt-1">
            墓地区画および契約データをインポートします。
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
          <p className="font-medium">インポート前にご確認ください</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>既存の墓地・契約データは全て削除され、インポートデータで上書きされます。</li>
            <li>戸主データを先にインポートしておく必要があります。</li>
            <li>「使用者履歴」などのテーブルがある場合、最古の使用開始日を契約の開始日にし、過去の使用者を契約履歴として取り込みます。</li>
            <li>大量データのインポートには数分かかる場合があります。</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-700">MDBファイルを選択</h3>
          </div>
          <form onSubmit={handleGraveSubmit} className="p-6 space-y-4">
            <div
              className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-stone-400 transition-colors"
              onClick={() => graveFileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📂</div>
              {graveFile ? (
                <div>
                  <p className="font-medium text-stone-700">{graveFile.name}</p>
                  <p className="text-sm text-stone-400 mt-1">
                    {(graveFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-stone-500">クリックして .mdb ファイルを選択</p>
                  <p className="text-sm text-stone-400 mt-1">
                    Microsoft Access データベースファイル (.mdb)
                  </p>
                </div>
              )}
              <input
                ref={graveFileRef}
                type="file"
                accept=".mdb,.accdb"
                onChange={handleGraveFileChange}
                className="hidden"
              />
            </div>

            {graveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {graveError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              {(graveFile || graveResult) && (
                <button
                  type="button"
                  onClick={handleGraveReset}
                  className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  リセット
                </button>
              )}
              <button
                type="submit"
                disabled={!graveFile || graveLoading}
                className="bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {graveLoading ? "インポート中..." : "インポート開始"}
              </button>
            </div>
          </form>
        </div>

        {graveLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin" />
            </div>
            <p className="text-stone-600 text-sm">
              データをインポートしています。しばらくお待ちください...
            </p>
          </div>
        )}

        {graveResult && !graveLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700">インポート結果</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{graveResult.graves}</div>
                  <div className="text-sm text-green-600 mt-1">墓地</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{graveResult.contracts}</div>
                  <div className="text-sm text-blue-600 mt-1">契約</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-700">{graveResult.histories ?? 0}</div>
                  <div className="text-sm text-amber-700 mt-1">契約履歴</div>
                </div>
                <div className={`border rounded-lg p-4 text-center ${graveResult.errors > 0 ? "bg-red-50 border-red-200" : "bg-stone-50 border-stone-200"}`}>
                  <div className={`text-3xl font-bold ${graveResult.errors > 0 ? "text-red-700" : "text-stone-400"}`}>
                    {graveResult.errors}
                  </div>
                  <div className={`text-sm mt-1 ${graveResult.errors > 0 ? "text-red-600" : "text-stone-400"}`}>
                    エラー
                  </div>
                </div>
              </div>

              {graveResult.errors === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  インポートが完了しました。墓地 {graveResult.graves} 件・契約 {graveResult.contracts} 件
                  {graveResult.histories != null && graveResult.histories > 0
                    ? `・契約履歴 ${graveResult.histories} 件`
                    : ""}
                  を登録しました。
                </div>
              )}

              {graveResult.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">エラー詳細（最大50件）:</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto">
                    {graveResult.errorDetails.map((msg, i) => (
                      <p key={i} className="text-xs text-red-700 font-mono">{msg}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
