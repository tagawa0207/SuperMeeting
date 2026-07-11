"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ResearchCard,
  ResearchResult,
  ResearchTarget,
  TriggerTarget,
} from "@/lib/types";

/** フィードに保持するカードの上限。超過分は古いものから落とす。 */
const MAX_CARDS = 20;
// Web 検索は時間がかかることがあるため長めのタイムアウトを付ける。
const TIMEOUT_MS = 90_000;
/** 自動検索の同時実行上限。超過時は最も古い実行中カードを中断する。 */
const MAX_AUTO_CONCURRENCY = 3;

/** 自動トリガーから積む検索タスク（useAutoResearch → useResearchFeed）。 */
export interface AutoResearchTask {
  /** Web 検索用の自然文クエリ。 */
  intent: string;
  /** 社内検索（Slack / Confluence）用のキーワード列。 */
  slackKeywords: string;
  target: TriggerTarget;
  triggeredBy: { segmentId: string; quote: string };
}

export interface UseResearchFeed {
  /** 新着順（先頭が最新）のカード一覧。 */
  cards: ResearchCard[];
  /** 手動調査: 1 クエリを web / internal の 2 枚のカードとして独立実行する。 */
  runManual: (query: string) => void;
  /** 自動調査: トリガー判定のタスク 1 件をカードとして積む（both は 2 枚）。 */
  runAuto: (task: AutoResearchTask) => void;
  clear: () => void;
}

export function useResearchFeed(): UseResearchFeed {
  const [cards, setCards] = useState<ResearchCard[]>([]);
  const seq = useRef(0);
  // 実行中の自動カードの AbortController（挿入順 = 古い順）。並列上限の制御に使う。
  const autoControllers = useRef(new Map<string, AbortController>());
  // 並列上限で中断したカードの id（タイムアウト起因の Abort と区別する）。
  const capAborted = useRef(new Set<string>());

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
      if (card.trigger === "auto") {
        autoControllers.current.set(card.id, controller);
      }
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
            ? capAborted.current.delete(card.id)
              ? "同時実行の上限に達したため中断しました"
              : "調査がタイムアウトしました。もう一度お試しください。"
            : err instanceof Error
              ? err.message
              : "調査に失敗しました";
        updateCard(card.id, { status: "error", summary: message });
      } finally {
        clearTimeout(timer);
        autoControllers.current.delete(card.id);
      }
    },
    [updateCard],
  );

  const pushCards = useCallback(
    (newCards: ResearchCard[]) => {
      setCards((prev) => [...newCards, ...prev].slice(0, MAX_CARDS));
      // Promise は待ち合わせない（片方の完了・失敗がもう片方をブロックしない）。
      newCards.forEach((card) => void runCard(card));
    },
    [runCard],
  );

  const runManual = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      const at = Date.now();
      const targets: ResearchTarget[] = ["internal", "web"];
      pushCards(
        targets.map((target) => ({
          id: `card-${at}-${seq.current++}`,
          query: q,
          target,
          status: "queued",
          trigger: "manual",
          at,
          sources: [],
        })),
      );
    },
    [pushCards],
  );

  const runAuto = useCallback(
    (task: AutoResearchTask) => {
      const targets: ResearchTarget[] =
        task.target === "both" ? ["internal", "web"] : [task.target];
      const at = Date.now();
      const newCards: ResearchCard[] = targets.map((target) => ({
        id: `card-${at}-${seq.current++}`,
        // internal は Slack のキーワードマッチに合わせたクエリを使う。
        query:
          target === "web" ? task.intent : task.slackKeywords || task.intent,
        slackKeywords: task.slackKeywords || undefined,
        target,
        status: "queued",
        trigger: "auto",
        triggeredBy: task.triggeredBy,
        at,
        sources: [],
      }));
      // 同時実行上限: 超過する分だけ最も古い実行中の自動カードを中断して error 扱いにする。
      const excess =
        autoControllers.current.size + newCards.length - MAX_AUTO_CONCURRENCY;
      if (excess > 0) {
        const oldest = [...autoControllers.current.entries()].slice(0, excess);
        for (const [id, controller] of oldest) {
          capAborted.current.add(id);
          autoControllers.current.delete(id);
          controller.abort();
        }
      }
      pushCards(newCards);
    },
    [pushCards],
  );

  const clear = useCallback(() => {
    setCards([]);
  }, []);

  return { cards, runManual, runAuto, clear };
}
