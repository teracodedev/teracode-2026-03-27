"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  disabled?: boolean;
  onCsv: () => void;
  onExcel: () => void;
  onFudemame: () => void;
}

export function DownloadMenu({ disabled, onCsv, onExcel, onFudemame }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 border border-stone-300 text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
      >
        ダウンロード
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 min-w-40 overflow-hidden">
          <button
            onClick={() => select(onCsv)}
            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <span className="text-stone-400 text-xs font-mono">CSV</span>
            CSV形式
          </button>
          <button
            onClick={() => select(onExcel)}
            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2 border-t border-stone-100"
          >
            <span className="text-green-600 text-xs font-mono">XLS</span>
            Excel形式
          </button>
          <button
            onClick={() => select(onFudemame)}
            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2 border-t border-stone-100"
          >
            <span className="text-blue-500 text-xs font-mono">筆</span>
            筆まめ形式 (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
