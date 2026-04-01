"use client";
import { useEffect } from "react";

export function CsrfPrefetch() {
  useEffect(() => {
    fetch("/api/auth/csrf").catch(() => {});
  }, []);
  return null;
}
