"use client";

import { useEffect, useState } from "react";
import type { MeetingAnalysis } from "@/lib/types";
import { MicIcon, StopIcon } from "@/components/icons";

function formatElapsed(sec: number): string {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** 画面最上部のヘッダー。ロゴ / REC / エンジンバッジ / 録音・整理・自動更新の操作。 */
export function AppHeader({
  listening,
  supported,
  extConnected,
  lang,
  onLangChange,
  onStart,
  onStop,
  analyzing,
  canAnalyze,
  onAnalyze,
  autoAnalyze,
  onToggleAutoAnalyze,
  engine,
  onLoadSample,
  onClear,
  hasContent,
}: {
  listening: boolean;
  supported: boolean;
  extConnected: boolean;
  lang: string;
  onLangChange: (lang: string) => void;
  onStart: () => void;
  onStop: () => void;
  analyzing: boolean;
  canAnalyze: boolean;
  onAnalyze: () => void;
  autoAnalyze: boolean;
  onToggleAutoAnalyze: () => void;
  engine: MeetingAnalysis["engine"] | null;
  onLoadSample: () => void;
  onClear: () => void;
  hasContent: boolean;
}) {
  // REC の経過時間（録音開始からの秒数）。リセットは開始ボタン側で行う。
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!listening) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [listening]);
  const handleStart = () => {
    setElapsed(0);
    onStart();
  };

  return (
    <header className="flex h-[58px] flex-none items-center gap-3.5 border-b border-line px-6">
      <div className="flex items-center gap-2.5">
        <div className="grid h-6 w-6 place-items-center rounded-[7px] bg-accent">
          <div className="h-[9px] w-[9px] rounded-[3px] border-2 border-white" />
        </div>
        <span className="text-[15px] font-bold tracking-[-.01em]">
          SuperMeeting
        </span>
      </div>
      <span className="text-[13px] text-ink-3">リアルタイム議事ノート</span>

      <div className="ml-auto flex items-center gap-2.5">
        {listening && (
          <div className="flex items-center gap-[7px]">
            <span className="h-2 w-2 animate-sm-pulse rounded-full bg-rec" />
            <span className="text-[13px] font-semibold tabular-nums">
              {formatElapsed(elapsed)}
            </span>
          </div>
        )}

        {extConnected && (
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            <span className="text-[11.5px] text-ink-2">Meet 拡張</span>
          </div>
        )}

        {engine && (
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                engine === "claude" ? "bg-green" : "bg-ink-5"
              }`}
            />
            <span className="text-[11.5px] text-ink-2">
              {engine === "claude" ? "Claude" : "ルールベース"}
            </span>
          </div>
        )}

        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value)}
          disabled={listening}
          title="音声認識の言語"
          className="h-[34px] rounded-lg border border-line bg-white px-2 text-[12.5px] text-ink-2 disabled:opacity-40"
        >
          <option value="ja-JP">日本語</option>
          <option value="en-US">English</option>
        </select>

        {listening ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 rounded-lg bg-dark px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#3B382F]"
          >
            <StopIcon size={12} />
            録音停止
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!supported || extConnected}
            title={
              extConnected
                ? "拡張から受信中のため、ローカル録音は不要です"
                : supported
                  ? ""
                  : "このブラウザは音声認識に非対応（Chrome 推奨）"
            }
            className="flex items-center gap-2 rounded-lg bg-dark px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#3B382F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MicIcon size={12} />
            録音開始
          </button>
        )}

        <button
          onClick={onAnalyze}
          disabled={analyzing || !canAnalyze}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {analyzing ? "整理中…" : "いま整理する"}
        </button>

        <button
          onClick={onToggleAutoAnalyze}
          className="flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-softer"
        >
          自動更新
          <span
            className={`relative inline-block h-4 w-7 rounded-full transition-colors duration-200 ${
              autoAnalyze ? "bg-accent" : "bg-line-dash"
            }`}
          >
            <span
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] duration-200"
              style={{ left: autoAnalyze ? 14 : 2 }}
            />
          </span>
        </button>

        <button
          onClick={onLoadSample}
          className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-softer"
        >
          サンプル
        </button>

        {hasContent && (
          <button
            onClick={onClear}
            className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-softer"
          >
            クリア
          </button>
        )}
      </div>
    </header>
  );
}
