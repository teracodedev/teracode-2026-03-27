"use client";
import { useState, useRef, useEffect } from "react";

const RELATION_OPTIONS = [
  "夫", "妻",
  "父", "母",
  "祖父", "祖母",
  "曾祖父", "曾祖母",
  "長男", "長女",
  "二男", "二女",
  "三男", "三女",
  "息子", "娘",
  "兄", "弟", "姉", "妹",
  "伯父", "伯母", "叔父", "叔母",
  "甥", "姪",
  "孫（男）", "孫（女）",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  referencePersonName?: string;
  className?: string;
  placeholder?: string;
}

export function RelationInput({ value, onChange, referencePersonName, className, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (relation: string) => {
    const text = referencePersonName ? `${referencePersonName}の${relation}` : relation;
    onChange(text);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={className ? `${className} rounded-r-none` : undefined}
      />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="border border-l-0 border-stone-300 rounded-r-lg px-2 bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs shrink-0 focus:outline-none"
        title="続柄を選択"
      >
        ▾
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full min-w-max bg-white border border-stone-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1">
          {RELATION_OPTIONS.map(r => {
            const label = referencePersonName ? `${referencePersonName}の${r}` : r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleSelect(r)}
                className="px-2 py-1 text-xs rounded-md border border-stone-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 text-stone-600 whitespace-nowrap"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
