"use client";

import { useState, useEffect } from "react";
import { TagBadge, type Tag } from "./TagBadge";

function fetchWithAuth(url: string) {
  return fetch(url).then((r) => {
    if (r.status === 401) window.location.href = "/login";
    return r;
  });
}

export function TagFilter({
  selectedTagIds,
  onChange,
}: {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  if (tags.length === 0) return null;

  const toggle = (tagId: string) => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onChange(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
          selectedTagIds.length > 0
            ? "border-stone-500 bg-stone-100 text-stone-800"
            : "border-stone-300 text-stone-600 hover:bg-stone-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        タグ
        {selectedTagIds.length > 0 && (
          <span className="bg-stone-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {selectedTagIds.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-stone-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-stone-500 mb-2">タグで絞り込み（AND条件）</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                onClick={() => toggle(tag.id)}
                selected={selectedTagIds.includes(tag.id)}
              />
            ))}
          </div>
          {selectedTagIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
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
