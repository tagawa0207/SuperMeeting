"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TranscriptSegment, TriggerResult, TriggerTask } from "@/lib/types";
import type { AutoResearchTask } from "@/hooks/useResearchFeed";

/** 判定に渡す直近発話のウィンドウ幅（SPEC: 6〜10 発話）。 */
const WINDOW_SIZE = 8;
/** 判定の最小間隔。in-flight バッファと合わせて実質 2〜3 秒に 1 回になる。 */
const MIN_JUDGE_INTERVAL_MS = 2000;
/** /api/trigger のタイムアウト。 */
const TRIGGER_TIMEOUT_MS = 15_000;
/** /api/trigger に渡す実行済みクエリの上限。 */
const RECENT_QUERIES_MAX = 20;

/** 重複判定用の正規化（小文字化・空白の圧縮）。完全一致で照合する。 */
function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * 発話確定を監視して自動検索をトリガーするフック。
 * 暴発防止の 3 枚のガードを実装する:
 *  a. 最小判定間隔（in-flight 中の発話はバッファし、完了後にまとめて判定）
 *  b. 実行済みクエリの正規化キャッシュによる重複抑制（サーバ側プロンプト注入 + クライアント側フィルタ）
 *  c. 検索の同時実行上限（useResearchFeed.runAuto 側で 3 並列に制限）
 */
export function useAutoResearch({
  segments,
  topicsSummary,
  enabled,
  runAuto,
}: {
  segments: TranscriptSegment[];
  topicsSummary?: string;
  /** 自動検索の ON/OFF。OFF の間は判定（/api/trigger への fetch）も一切走らない。 */
  enabled: boolean;
  runAuto: (task: AutoResearchTask) => void;
}): void {
  // 最新値をコールバックから参照するための ref。
  const segmentsRef = useRef(segments);
  const topicsSummaryRef = useRef(topicsSummary);
  const enabledRef = useRef(enabled);
  const runAutoRef = useRef(runAuto);
  topicsSummaryRef.current = topicsSummary;
  runAutoRef.current = runAuto;

  // 判定済み発話数。これより後ろの発話が「未判定バッファ」になる。
  const judgedUpTo = useRef(0);
  const inFlight = useRef(false);
  const lastStartAt = useRef(0);
  const retryTimer = useRef<number | null>(null);
  // 実行済みクエリのキャッシュ（正規化キー → 元のクエリ、挿入順 = 古い順）。
  const executed = useRef(new Map<string, string>());
  // judge の再帰呼び出し（タイマー・完了後の再判定）用の間接参照。
  const judgeRef = useRef<() => void>(() => {});

  const rememberQuery = useCallback((query: string) => {
    const key = normalizeQuery(query);
    if (!key) return;
    executed.current.delete(key);
    executed.current.set(key, query.trim());
  }, []);

  const dispatchTask = useCallback(
    (task: TriggerTask, windowSegs: TranscriptSegment[]) => {
      // クライアント側の重複抑制: 実行済みクエリと一致するタスクは捨てる。
      const keys: string[] = [];
      if (task.target !== "internal") keys.push(normalizeQuery(task.intent));
      if (task.target !== "web") keys.push(normalizeQuery(task.slackKeywords));
      if (keys.some((k) => k && executed.current.has(k))) return;
      if (task.target !== "internal") rememberQuery(task.intent);
      if (task.target !== "web") rememberQuery(task.slackKeywords);

      // triggeredBy の引用から発端の発話を特定する（一致しなければウィンドウ末尾）。
      const quote = task.triggeredBy.trim();
      const seg =
        windowSegs.find(
          (s) =>
            quote.length > 0 &&
            (s.text.includes(quote) || quote.includes(s.text)),
        ) ?? windowSegs[windowSegs.length - 1];
      runAutoRef.current({
        intent: task.intent,
        slackKeywords: task.slackKeywords,
        target: task.target,
        triggeredBy: { segmentId: seg?.id ?? "", quote },
      });
    },
    [rememberQuery],
  );

  const judge = useCallback(async () => {
    if (!enabledRef.current || inFlight.current) return;
    const segs = segmentsRef.current;
    if (segs.length <= judgedUpTo.current) return;

    // ガード a: 判定の最小間隔。早すぎる場合はタイマーで再試行する。
    const wait = lastStartAt.current + MIN_JUDGE_INTERVAL_MS - Date.now();
    if (wait > 0) {
      if (retryTimer.current === null) {
        retryTimer.current = window.setTimeout(() => {
          retryTimer.current = null;
          judgeRef.current();
        }, wait);
      }
      return;
    }

    inFlight.current = true;
    lastStartAt.current = Date.now();
    const windowSegs = segs.slice(-WINDOW_SIZE);
    judgedUpTo.current = segs.length;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: windowSegs.map((s) => ({
            id: s.id,
            speaker: s.speaker,
            text: s.text,
          })),
          topicsSummary: topicsSummaryRef.current,
          recentQueries: [...executed.current.values()].slice(
            -RECENT_QUERIES_MAX,
          ),
        }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const result = (await res.json()) as TriggerResult;
      // 判定中に OFF にされた場合は検索を積まない。
      if (!enabledRef.current || !result.shouldSearch) return;
      result.tasks.forEach((task) => dispatchTask(task, windowSegs));
    } catch {
      // 自動レーンはベストエフォート。判定失敗は静かに流す（次の発話で再判定される）。
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      // ガード a: in-flight 中に確定した発話があれば続けて判定する。
      if (
        enabledRef.current &&
        segmentsRef.current.length > judgedUpTo.current
      ) {
        judgeRef.current();
      }
    }
  }, [dispatchTask]);

  useEffect(() => {
    judgeRef.current = () => void judge();
  }, [judge]);

  // ON/OFF の切替。OFF→ON では過去の発話を判定対象にしない（切替後の発話のみ）。
  useEffect(() => {
    if (enabled && !enabledRef.current) {
      judgedUpTo.current = segmentsRef.current.length;
    }
    enabledRef.current = enabled;
  }, [enabled]);

  // 発話確定の監視。
  useEffect(() => {
    segmentsRef.current = segments;
    // クリア等で発話が減った場合はカーソルを同期する。
    if (segments.length < judgedUpTo.current) {
      judgedUpTo.current = segments.length;
    }
    if (!enabled) return;
    if (segments.length > judgedUpTo.current) void judge();
  }, [segments, enabled, judge]);

  // アンマウント時に再試行タイマーを止める。
  useEffect(() => {
    return () => {
      if (retryTimer.current !== null) clearTimeout(retryTimer.current);
    };
  }, []);
}
