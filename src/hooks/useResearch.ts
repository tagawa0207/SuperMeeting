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
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `調査に失敗しました (${res.status})`);
      }
      setResult((await res.json()) as ResearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "調査に失敗しました");
    } finally {
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
