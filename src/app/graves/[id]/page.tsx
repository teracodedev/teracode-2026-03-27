"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, use } from "react";
import type { FormEvent } from "react";
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

interface GraveEditForm {
  plotNumber: string;
  width: string;
  depth: string;
  permanentUsageFee: string;
  managementFee: string;
  note: string;
}

const numberToFormValue = (value: number | null) =>
  value == null ? "" : String(value);

const parseFormNumber = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateArea = (width: string, depth: string) => {
  const widthValue = parseFormNumber(width);
  const depthValue = parseFormNumber(depth);
  if (widthValue == null || depthValue == null) return null;
  return Math.round((widthValue * depthValue) / 10000 * 10000) / 10000;
};

const formatArea = (value: number | null) => {
  if (value == null) return "-";
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 4 })} m²`;
};

const graveToForm = (grave: GravePlot): GraveEditForm => ({
  plotNumber: grave.plotNumber,
  width: numberToFormValue(grave.width),
  depth: numberToFormValue(grave.depth),
  permanentUsageFee: numberToFormValue(grave.permanentUsageFee),
  managementFee: numberToFormValue(grave.managementFee),
  note: grave.note || "",
});

export default function GraveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [grave, setGrave] = useState<GravePlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editForm, setEditForm] = useState<GraveEditForm>({
    plotNumber: "",
    width: "",
    depth: "",
    permanentUsageFee: "",
    managementFee: "",
    note: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/graves/${id}`);
        if (!res.ok) {
          setError("墓地が見つかりません");
          return;
        }
        const data = await res.json();
        setGrave(data);
        setEditForm(graveToForm(data));
      } catch {
        setError("エラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatCurrency = (v: number | null) =>
    v != null ? `¥${v.toLocaleString()}` : "-";

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ja-JP");
  };

  const updateEditForm = (patch: Partial<GraveEditForm>) => {
    setEditForm((current) => ({ ...current, ...patch }));
  };

  const startEditing = () => {
    if (grave) setEditForm(graveToForm(grave));
    setSaveError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    if (grave) setEditForm(graveToForm(grave));
    setSaveError("");
    setEditing(false);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const area = calculateArea(editForm.width, editForm.depth);
      const res = await fetchWithAuth(`/api/graves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          area,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data?.error || "保存に失敗しました");
        return;
      }
      setGrave(data);
      setEditForm(graveToForm(data));
      setEditing(false);
    } catch {
      setSaveError("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="text-center py-12 text-stone-400">読み込み中...</div>
    );
  if (error || !grave)
    return (
      <div className="text-center py-12 text-stone-400">
        {error || "墓地が見つかりません"}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/graves"
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← 墓地一覧
          </Link>
          <h1 className="text-2xl font-bold text-amber-700">
            墓地 No. {grave.plotNumber}
          </h1>
        </div>
      </div>

      {/* 墓地情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-stone-800">墓地情報</h2>
          {editing ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg hover:bg-stone-50 text-sm font-medium"
            >
              キャンセル
            </button>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="bg-stone-700 text-white px-4 py-1.5 rounded-lg hover:bg-stone-800 text-sm font-medium"
            >
              編集
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm text-stone-500 mb-1">
                    墓地番号
                  </span>
                  <input
                    value={editForm.plotNumber}
                    onChange={(e) =>
                      updateEditForm({ plotNumber: e.target.value })
                    }
                    required
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
                <div>
                  <span className="block text-sm text-stone-500 mb-1">
                    UUID
                  </span>
                  <div className="text-stone-500 text-xs font-mono py-2">
                    {grave.id}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-sm text-stone-500 mb-1">
                    横 (cm)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.width}
                    onChange={(e) => updateEditForm({ width: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-stone-500 mb-1">
                    奥行き (cm)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.depth}
                    onChange={(e) => updateEditForm({ depth: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
                <div>
                  <span className="block text-sm text-stone-500 mb-1">
                    面積
                  </span>
                  <div className="text-stone-800 py-2">
                    {formatArea(calculateArea(editForm.width, editForm.depth))}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-sm text-stone-500 mb-1">
                    永代使用料
                  </span>
                  <input
                    type="number"
                    value={editForm.permanentUsageFee}
                    onChange={(e) =>
                      updateEditForm({ permanentUsageFee: e.target.value })
                    }
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-stone-500 mb-1">
                    管理費
                  </span>
                  <input
                    type="number"
                    value={editForm.managementFee}
                    onChange={(e) =>
                      updateEditForm({ managementFee: e.target.value })
                    }
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-sm text-stone-500 mb-1">
                    備考
                  </span>
                  <textarea
                    value={editForm.note}
                    onChange={(e) => updateEditForm({ note: e.target.value })}
                    rows={3}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </label>
              </div>
              {saveError && <div className="text-sm text-red-600">{saveError}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg hover:bg-stone-50 text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-stone-700 text-white px-4 py-1.5 rounded-lg hover:bg-stone-800 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-stone-500">墓地番号</dt>
                <dd className="text-stone-800 font-medium">
                  {grave.plotNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">UUID</dt>
                <dd className="text-stone-500 text-xs font-mono">{grave.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">区画サイズ (横 × 奥行き)</dt>
                <dd className="text-stone-800">
                  {grave.width != null && grave.depth != null
                    ? `${grave.width}cm × ${grave.depth}cm`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">面積</dt>
                <dd className="text-stone-800">
                  {formatArea(
                    grave.width != null && grave.depth != null
                      ? calculateArea(String(grave.width), String(grave.depth))
                      : grave.area
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">永代使用料</dt>
                <dd className="text-stone-800">
                  {formatCurrency(grave.permanentUsageFee)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">管理費</dt>
                <dd className="text-stone-800">
                  {formatCurrency(grave.managementFee)}
                </dd>
              </div>
              {grave.note && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-stone-500">備考</dt>
                <dd className="text-stone-800 whitespace-pre-wrap">
                  {grave.note}
                </dd>
              </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {/* 契約情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800">
            使用契約 ({grave.contracts.length}件)
          </h2>
        </div>
        {grave.contracts.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400">
            契約情報がありません
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {grave.contracts.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/householder/${c.householder.id}`}
                        className="text-stone-800 font-medium hover:text-amber-700 hover:underline"
                      >
                        {c.householder.familyName} {c.householder.givenName}
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
                    <div className="text-xs text-stone-400 mt-0.5 font-mono">
                      契約ID: {c.id}
                    </div>
                  </div>
                  <div className="text-sm text-stone-600">
                    <span>
                      {formatDate(c.startDate)} 〜 {formatDate(c.endDate)}
                    </span>
                  </div>
                </div>
                {c.note && (
                  <div className="text-sm text-stone-500 mt-2 whitespace-pre-wrap">
                    {c.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
