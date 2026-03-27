import { useState, useEffect } from "react";

const STORAGE_KEY = "teracode_shared_search";

export function useSharedSearch() {
  const [query, setQueryState] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "";
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
      if (value) {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  return { query, setQuery };
}
