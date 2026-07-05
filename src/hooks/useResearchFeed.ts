"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ResearchCard,
  ResearchResult,
  ResearchTarget,
} from "@/lib/types";

/** フィードに保持するカードの上限。超過分は古いものから落とす。 */
const MAX_CARDS = 20;
// Web 検索は時間がかかることがあるため長めのタイムアウトを付ける。
const TIMEOUT_MS = 90_000;

export interface UseResearchFeed {
  /** 新着順（先頭が最新）のカード一覧。 */
  cards: ResearchCard[];
  /** 手動調査: 1 クエリを web / internal の 2 枚のカードとして独立実行する。 */
  runManual: (query: string) => void;
  clear: () => void;
}

export function useResearchFeed(): UseResearchFeed {
  const [cards, setCards] = useState<ResearchCard[]>([]);
  const seq = useRef(0);

  const updateCard = useCallback(
    (id: string, patch: Partial<ResearchCard>) => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  // 1 枚のカードを単独で実行する。他のカードの完了・失敗をブロックしない。
  const runCard = useCallback(
    async (card: ResearchCard) => {
      updateCard(card.id, { status: "searching" });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: card.query, target: card.target }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || `調査に失敗しました (${res.status})`);
        }
        const result = (await res.json()) as ResearchResult;
        updateCard(card.id, {
          status: "done",
          summary: result.summary || result.internalNote || "",
          sources: result.sources,
        });
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "AbortError"
            ? "調査がタイムアウトしました。もう一度お試しください。"
            : err instanceof Error
              ? err.message
              : "調査に失敗しました";
        updateCard(card.id, { status: "error", summary: message });
      } finally {
        clearTimeout(timer);
      }
    },
    [updateCard],
  );

  const runManual = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      const at = Date.now();
      const targets: ResearchTarget[] = ["internal", "web"];
      const newCards: ResearchCard[] = targets.map((target) => ({
        id: `card-${at}-${seq.current++}`,
        query: q,
        target,
        status: "queued",
        trigger: "manual",
        at,
        sources: [],
      }));
      setCards((prev) => [...newCards, ...prev].slice(0, MAX_CARDS));
      // Promise は待ち合わせない（片方の完了・失敗がもう片方をブロックしない）。
      newCards.forEach((card) => void runCard(card));
    },
    [runCard],
  );

  const clear = useCallback(() => {
    setCards([]);
  }, []);

  return { cards, runManual, clear };
}
