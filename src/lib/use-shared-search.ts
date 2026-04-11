import { useState, useEffect } from "react";

const STORAGE_KEY = "teracode_shared_search";

export function useSharedSearch() {
  // 初回は常に ""（サーバーとクライアントの HTML を一致させる）。
  // localStorage はマウント後に読み込む（ハイドレーション不一致を防ぐ）。
  const [query, setQueryState] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setQueryState(stored);
    } catch {
      // ignore
    }
  }, []);

  // 他タブ・ページからの変更を同期
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setQueryState(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setQuery = (value: string) => {
    setQueryState(value);
    if (typeof window !== "undefined") {
      try {
        if (value) {
          localStorage.setItem(STORAGE_KEY, value);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Storage が利用不可の環境ではメモリ状態のみ更新する
      }
    }
  };

  return { query, setQuery };
}
