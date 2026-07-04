"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MeetingAnalysis } from "@/lib/types";

export interface UseAnalysis {
  analysis: MeetingAnalysis | null;
  analyzing: boolean;
  error: string | null;
  lastAnalyzedAt: number | null;
  /** 即時に分析を実行する。 */
  analyzeNow: (transcript: string) => Promise<void>;
}

/**
 * 書き起こしの分析を管理するフック。
 * autoIntervalMs > 0 のとき、transcript の変化を監視して一定間隔で自動分析する。
 */
export function useAnalysis(
  transcript: string,
  autoIntervalMs = 0,
): UseAnalysis {
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(null);
  const inFlight = useRef(false);
  const lastTextRef = useRef("");

  const analyzeNow = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    setAnalyzing(true);
    setError(null);
    // 応答が返らない場合に UI が固まったままにならないようタイムアウトを付ける。
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `分析に失敗しました (${res.status})`);
      }
      const data = (await res.json()) as MeetingAnalysis;
      setAnalysis(data);
      setLastAnalyzedAt(Date.now());
      lastTextRef.current = trimmed;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("分析がタイムアウトしました。もう一度お試しください。");
      } else {
        setError(err instanceof Error ? err.message : "分析に失敗しました");
      }
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (autoIntervalMs <= 0) return;
    const timer = setInterval(() => {
      const trimmed = transcript.trim();
      // 前回から内容が変わったときだけ分析する（無駄な API 呼び出しを避ける）。
      if (trimmed && trimmed !== lastTextRef.current) {
        void analyzeNow(trimmed);
      }
    }, autoIntervalMs);
    return () => clearInterval(timer);
  }, [transcript, autoIntervalMs, analyzeNow]);

  return { analysis, analyzing, error, lastAnalyzedAt, analyzeNow };
}
