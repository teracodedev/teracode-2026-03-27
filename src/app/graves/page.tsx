"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, useCallback } from "react";
import { useSharedSearch } from "@/lib/use-shared-search";
import Link from "next/link";

interface GraveContract {
  id: string;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  householder: {
    id: string;
    familyName: string;
    givenName: string;
    familyRegister: { id: string; name: string } | null;
  };
}

interface GravePlot {
  id: string;
  plotNumber: string;
  area: number | null;
  width: number | null;
  depth: number | null;
  permanentUsageFee: number | null;
  managementFee: number | null;
  note: string | null;
  contracts: GraveContract[];
}

const EMPTY_GRAVE_FORM = {
  plotNumber: "",
  area: "",
  width: "",
  depth: "",
  permanentUsageFee: "",
  managementFee: "",
  note: "",
};

export default function GravesPage() {
  const [graves, setGraves] = useState<GravePlot[]>([]);
  const { query, setQuery } = useSharedSearch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_GRAVE_FORM);
  const [createError, setCreateError] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const PAGE_SIZE = 20;

  const fetchGraves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetchWithAuth(`/api/graves?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setGraves([]);
        setError(data?.error || "データの取得に失敗しました");
        return;
      }
      setGraves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setGraves([]);
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(fetchGraves, 300);
    return () => clearTimeout(timer);
  }, [fetchGraves]);

  const formatCurrency = (v: number | null) =>
    v != null ? `¥${v.toLocaleString()}` : "-";

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-stone-400";

  const handleCreateGrave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreate(true);
    setCreateError("");
    try {
      const res = await fetchWithAuth("/api/graves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotNumber: createForm.plotNumber,
          area: createForm.area || null,
          width: createForm.width || null,
          depth: createForm.depth || null,
          permanentUsageFee: createForm.permanentUsageFee || null,
          managementFee: createForm.managementFee || null,
          note: createForm.note || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError((data as { error?: string }).error || "墓地区画の作成に失敗しました");
        return;
      }
      setShowCreateForm(false);
      setCreateForm(EMPTY_GRAVE_FORM);
      setCurrentPage(1);
      await fetchGraves();
    } catch {
      setCreateError("墓地区画の作成に失敗しました");
    } finally {
      setSavingCreate(false);
    }
  };

  const paged = graves.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const totalPages = Math.ceil(graves.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-amber-700">墓地台帳</h1>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((v) => !v);
            setCreateError("");
          }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
        >
          {showCreateForm ? "キャンセル" : "新規作成"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateGrave} className="bg-white rounded-xl border border-amber-200 p-4 space-y-4">
          <h2 className="font-medium text-stone-700">墓地区画 新規作成</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">墓地番号 <span className="text-red-500">*</span></label>
              <input
                required
                value={createForm.plotNumber}
                onChange={(e) => setCreateForm((f) => ({ ...f, plotNumber: e.target.value }))}
                className={inputCls}
                placeholder="A-001"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">面積</label>
              <input
                type="number"
                step="0.01"
                value={createForm.area}
                onChange={(e) => setCreateForm((f) => ({ ...f, area: e.target.value }))}
                className={inputCls}
                placeholder="1.2"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">幅(cm)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.width}
                onChange={(e) => setCreateForm((f) => ({ ...f, width: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">奥行(cm)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.depth}
                onChange={(e) => setCreateForm((f) => ({ ...f, depth: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">永代使用料</label>
              <input
                type="number"
                value={createForm.permanentUsageFee}
                onChange={(e) => setCreateForm((f) => ({ ...f, permanentUsageFee: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">管理費</label>
              <input
                type="number"
                value={createForm.managementFee}
                onChange={(e) => setCreateForm((f) => ({ ...f, managementFee: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-stone-500 mb-1">備考</label>
              <textarea
                value={createForm.note}
                onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
                className={inputCls}
                rows={2}
              />
            </div>
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(EMPTY_GRAVE_FORM);
                setCreateError("");
              }}
              className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg text-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={savingCreate}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {savingCreate ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="墓地番号・使用者名で検索..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-base text-stone-800 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      {!loading && query && (
        <div className="text-sm text-stone-500">
          検索結果: {graves.length}件
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : error ? (
        <div className="text-center py-12 text-stone-400">{error}</div>
      ) : graves.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>墓地が登録されていません</p>
          <p className="text-sm mt-2">
            「各種設定」→「データインポート」から MDB ファイルを取り込めます
          </p>
        </div>
      ) : (
        <>
          {/* モバイル: カード表示 */}
          <div className="md:hidden space-y-2">
            {paged.map((grave) => (
              <Link
                key={grave.id}
                href={`/graves/${grave.id}`}
                className="block bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden active:bg-stone-50"
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-stone-800 text-base">
                        No. {grave.plotNumber}
                      </div>
                      {(grave.width || grave.depth || grave.area) && (
                        <div className="text-xs text-stone-500 mt-0.5">
                          {grave.width && grave.depth
                            ? `${grave.width}cm × ${grave.depth}cm`
                            : grave.area
                              ? `面積: ${grave.area}m²`
                              : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 text-xs text-stone-500">
                      <span>管理費: {formatCurrency(grave.managementFee)}</span>
                      <span>
                        永代使用料: {formatCurrency(grave.permanentUsageFee)}
                      </span>
                    </div>
                  </div>
                  {grave.contracts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {grave.contracts.map((c) => (
                        <div
                          key={c.id}
                          className="text-sm text-stone-600 flex items-center gap-2"
                        >
                          <span>
                            {c.householder.familyName} {c.householder.givenName}
                          </span>
                          {c.householder.familyRegister && (
                            <span className="text-xs text-amber-700">
                              ({c.householder.familyRegister.name})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
            <div className="text-xs text-stone-400 px-1 pt-1">
              {graves.length}件中{" "}
              {Math.min((currentPage - 1) * PAGE_SIZE + 1, graves.length)}〜
              {Math.min(currentPage * PAGE_SIZE, graves.length)}件表示
            </div>
          </div>

          {/* デスクトップ: テーブル表示 */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    墓地番号
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    区画 (横×奥)
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    永代使用料
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    管理費
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">
                    使用者 / 家族・親族台帳
                  </th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium whitespace-nowrap">
                    詳細
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paged.map((grave) => (
                  <tr key={grave.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-800 font-medium">
                      {grave.plotNumber}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {grave.width && grave.depth
                        ? `${grave.width}cm × ${grave.depth}cm`
                        : grave.area
                          ? `${grave.area}m²`
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatCurrency(grave.permanentUsageFee)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatCurrency(grave.managementFee)}
                    </td>
                    <td className="px-4 py-3">
                      {grave.contracts.length > 0 ? (
                        <div className="space-y-1">
                          {grave.contracts.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Link
                                href={`/householder/${c.householder.id}`}
                                className="text-stone-800 hover:text-amber-700 hover:underline"
                              >
                                {c.householder.familyName}{" "}
                                {c.householder.givenName}
                              </Link>
                              {c.householder.familyRegister && (
                                <Link
                                  href={`/family-register/${c.householder.familyRegister.id}`}
                                  className="text-xs text-amber-700 hover:text-amber-800 hover:underline"
                                >
                                  {c.householder.familyRegister.name}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-300 text-sm">未設定</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <Link
                        href={`/graves/${grave.id}`}
                        className="text-amber-700 hover:text-amber-800 hover:underline"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-400">
              {graves.length}件中{" "}
              {Math.min((currentPage - 1) * PAGE_SIZE + 1, graves.length)}〜
              {Math.min(currentPage * PAGE_SIZE, graves.length)}件表示
            </div>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← 前へ
              </button>
              <span className="text-sm text-stone-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                次へ →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
