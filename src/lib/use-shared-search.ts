import { useState, useEffect } from "react";

const STORAGE_KEY = "teracode_shared_search";

export function useSharedSearch() {
  const [query, setQueryState] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

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
