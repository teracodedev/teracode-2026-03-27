"use client";

import { useState, useEffect, useCallback } from "react";
import { TagBadge, type Tag } from "./TagBadge";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#78716c",
];

function fetchWithAuth(url: string, opts?: RequestInit) {
  return fetch(url, opts).then((r) => {
    if (r.status === 401) window.location.href = "/login";
    return r;
  });
}

export function TagManager({
  entityType,
  entityId,
}: {
  entityType: "householder" | "member";
  entityId: string;
}) {
  const [assignedTags, setAssignedTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const tagsUrl =
    entityType === "householder"
      ? `/api/householder/${entityId}/tags`
      : `/api/members/${entityId}/tags`;

  const loadTags = useCallback(async () => {
    const [assigned, all] = await Promise.all([
      fetchWithAuth(tagsUrl).then((r) => r.json()),
      fetchWithAuth("/api/tags").then((r) => r.json()),
    ]);
    setAssignedTags(assigned);
    setAllTags(all);
  }, [tagsUrl]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const assignTag = async (tagId: string) => {
    await fetchWithAuth(tagsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    await loadTags();
  };

  const removeTag = async (tagId: string) => {
    await fetchWithAuth(tagsUrl, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    await loadTags();
  };

  const createAndAssignTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetchWithAuth("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (res.ok) {
      const tag = await res.json();
      await assignTag(tag.id);
      setNewTagName("");
    }
  };

  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !assignedIds.has(t.id));

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {assignedTags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
        ))}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-600"
        >
          + タグ
        </button>
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-stone-200 rounded-lg shadow-lg p-3">
          {availableTags.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-stone-500 mb-1">既存のタグ</p>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onClick={() => {
                      assignTag(tag.id);
                      setShowPicker(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-stone-100 pt-2">
            <p className="text-xs text-stone-500 mb-1">新しいタグを作成</p>
            <div className="flex gap-1 mb-1.5">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndAssignTag()}
                placeholder="タグ名"
                className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={createAndAssignTag}
                disabled={!newTagName.trim()}
                className="px-2 py-1 bg-stone-700 text-white rounded text-xs disabled:opacity-40"
              >
                追加
              </button>
            </div>
            <div className="flex gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTagColor(c)}
                  className={`w-5 h-5 rounded-full ${
                    newTagColor === c ? "ring-2 ring-offset-1 ring-stone-500" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="mt-2 w-full text-xs text-stone-400 hover:text-stone-600"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
