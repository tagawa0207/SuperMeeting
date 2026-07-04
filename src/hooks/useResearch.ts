"use client";

import { useCallback, useState } from "react";
import type { ResearchResult } from "@/lib/types";

export interface UseResearch {
  result: ResearchResult | null;
  loading: boolean;
  error: string | null;
  /** 直近で実行したクエリ。 */
  activeQuery: string | null;
  run: (query: string) => Promise<void>;
  clear: () => void;
}

export function useResearch(): UseResearch {
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  const run = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setActiveQuery(q);
    setLoading(true);
    setError(null);
    // Web 検索は時間がかかることがあるため長めのタイムアウトを付ける。
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `調査に失敗しました (${res.status})`);
      }
      setResult((await res.json()) as ResearchResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("調査がタイムアウトしました。もう一度お試しください。");
      } else {
        setError(err instanceof Error ? err.message : "調査に失敗しました");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setActiveQuery(null);
  }, []);

  return { result, loading, error, activeQuery, run, clear };
}
