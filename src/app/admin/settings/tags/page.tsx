"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TagBadge, type Tag } from "@/components/TagBadge";

const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#78716c",
];

type TagWithCounts = Tag & {
  createdAt?: string;
  _count: { householderTags: number; memberTags: number };
};

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<TagWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "読み込みに失敗しました");
        setTags([]);
        return;
      }
      setTags(Array.isArray(data) ? data : []);
    } catch {
      setError("読み込みに失敗しました");
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (t: TagWithCounts) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setFormError("");
    setSuccess("");
    setCreating(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setFormError(data.error === "name is required" ? "タグ名を入力してください" : data.error || "作成に失敗しました");
      return;
    }
    setSuccess(`タグ「${data.name}」を作成しました`);
    setNewName("");
    await load();
  };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) {
      setError("タグ名を入力してください");
      return;
    }
    setError("");
    setSuccess("");
    setSavingId(id);
    const res = await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: editColor }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(data.error || "保存に失敗しました");
      return;
    }
    setSuccess(`タグ「${data.name}」を更新しました`);
    cancelEdit();
    await load();
  };

  const handleDelete = async (t: TagWithCounts) => {
    const hh = t._count.householderTags;
    const mm = t._count.memberTags;
    const parts: string[] = [];
    if (hh > 0) parts.push(`戸主 ${hh} 件`);
    if (mm > 0) parts.push(`世帯員 ${mm} 件`);
    const usage = parts.length > 0 ? `\n付与: ${parts.join("、")}（削除すると付与も外れます）` : "";
    if (!confirm(`タグ「${t.name}」を削除しますか？${usage}`)) return;
    setError("");
    setSuccess("");
    const res = await fetch(`/api/tags/${t.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "削除に失敗しました");
      return;
    }
    setSuccess(`タグ「${t.name}」を削除しました`);
    if (editingId === t.id) cancelEdit();
    await load();
  };

  const inputCls =
    "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link href="/admin/settings" className="text-sm text-amber-700 hover:text-amber-800 mb-2 inline-block">
          ← 各種設定
        </Link>
        <h1 className="text-2xl font-bold text-amber-700">タグの管理</h1>
        <p className="text-stone-500 text-sm mt-1">
          戸主・世帯員に付けられるタグの一覧表示、新規作成、名前・色の変更、削除ができます。
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800 border-b border-stone-100 pb-2">新しいタグを作成</h2>
        {formError && (
          <div className="p-2 bg-red-50 border border-red-100 rounded text-red-700 text-sm">{formError}</div>
        )}
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[12rem]">
            <label htmlFor="new-tag-name" className="block text-sm font-medium text-stone-700 mb-1">
              タグ名
            </label>
            <input
              id="new-tag-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inputCls}
              placeholder="例: 年忌法要"
              maxLength={100}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1">色</span>
            <div className="flex gap-1 flex-wrap">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-8 h-8 rounded-full shrink-0 ${newColor === c ? "ring-2 ring-offset-2 ring-amber-500" : ""}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? "作成中…" : "作成"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700">登録済みタグ</h2>
        </div>
        {loading ? (
          <div className="p-6 text-stone-400 text-sm">読み込み中...</div>
        ) : tags.length === 0 ? (
          <div className="p-6 text-stone-400 text-sm">タグがまだありません。上のフォームから作成できます。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500">表示</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500">タグ名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500">戸主での使用</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500">世帯員での使用</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tags.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/80">
                    <td className="px-6 py-3 align-middle">
                      <TagBadge tag={editingId === t.id ? { ...t, name: editName.trim() || t.name, color: editColor } : t} />
                    </td>
                    <td className="px-6 py-3 align-middle">
                      {editingId === t.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputCls}
                            maxLength={100}
                          />
                          <div>
                            <span className="text-xs text-stone-500 mr-2">色</span>
                            <div className="inline-flex gap-1 flex-wrap align-middle mt-1">
                              {TAG_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditColor(c)}
                                  className={`w-7 h-7 rounded-full ${editColor === c ? "ring-2 ring-offset-1 ring-amber-500" : ""}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-stone-800">{t.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-stone-600 align-middle">{t._count.householderTags}</td>
                    <td className="px-6 py-3 text-stone-600 align-middle">{t._count.memberTags}</td>
                    <td className="px-6 py-3 text-right align-middle whitespace-nowrap">
                      {editingId === t.id ? (
                        <span className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(t.id)}
                            disabled={savingId === t.id || !editName.trim()}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-40"
                          >
                            {savingId === t.id ? "保存中…" : "保存"}
                          </button>
                          <button type="button" onClick={cancelEdit} className="text-xs text-stone-500 hover:text-stone-700">
                            キャンセル
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-3 justify-end">
                          <button type="button" onClick={() => startEdit(t)} className="text-xs text-amber-700 hover:text-amber-900">
                            編集
                          </button>
                          <button type="button" onClick={() => handleDelete(t)} className="text-xs text-red-500 hover:text-red-700">
                            削除
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
