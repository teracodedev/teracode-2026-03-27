"use client";

import { useState, useEffect } from "react";
import { type Tag } from "./TagBadge";

function fetchWithAuth(url: string) {
  return fetch(url).then((r) => {
    if (r.status === 401) window.location.href = "/login";
    return r;
  });
}

export function TagFilter({
  selectedTagIds,
  notTagIds,
  onChange,
}: {
  selectedTagIds: string[];
  notTagIds?: string[];
  onChange: (tagIds: string[], notTagIds: string[]) => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const effectiveNotTagIds = notTagIds ?? [];

  useEffect(() => {
    fetchWithAuth("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  if (tags.length === 0) return null;

  // 3-state toggle: unselected → AND → NOT → unselected
  const toggle = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    const isNot = effectiveNotTagIds.includes(tagId);

    if (!isSelected && !isNot) {
      // unselected → AND
      onChange([...selectedTagIds, tagId], effectiveNotTagIds);
    } else if (isSelected) {
      // AND → NOT
      onChange(
        selectedTagIds.filter((id) => id !== tagId),
        [...effectiveNotTagIds, tagId],
      );
    } else {
      // NOT → unselected
      onChange(selectedTagIds, effectiveNotTagIds.filter((id) => id !== tagId));
    }
  };

  const totalCount = selectedTagIds.length + effectiveNotTagIds.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
          totalCount > 0
            ? "border-stone-500 bg-stone-100 text-stone-800"
            : "border-stone-300 text-stone-600 hover:bg-stone-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        タグ
        {totalCount > 0 && (
          <span className="bg-stone-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-stone-500 mb-2">クリックで切替: 未選択 → AND → NOT</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const isNot = effectiveNotTagIds.includes(tag.id);
              return (
                <span
                  key={tag.id}
                  onClick={() => toggle(tag.id)}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                    isSelected ? "ring-2 ring-offset-1 ring-stone-500" : ""
                  } ${isNot ? "ring-2 ring-offset-1 ring-red-500" : ""}`}
                  style={{
                    backgroundColor: isNot ? "#fee2e2" : tag.color + "20",
                    color: isNot ? "#dc2626" : tag.color,
                    borderColor: isNot ? "#fca5a5" : tag.color + "40",
                    borderWidth: "1px",
                    textDecoration: isNot ? "line-through" : "none",
                  }}
                >
                  {isNot && <span className="mr-0.5">NOT</span>}
                  {tag.name}
                </span>
              );
            })}
          </div>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => onChange([], [])}
              className="mt-2 text-xs text-stone-400 hover:text-stone-600"
            >
              フィルターをクリア
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 w-full text-xs text-stone-400 hover:text-stone-600"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
