"use client";

import { useState } from "react";
import { useTranscription } from "@/hooks/useTranscription";
import { useAnalysis } from "@/hooks/useAnalysis";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { AnalysisBoard } from "@/components/AnalysisBoard";

// デモ用のサンプル会議（マイクが使えない環境でも動作確認できる）。
const SAMPLE = [
  "今日は新しい採用管理ツールの導入について議論します。",
  "現状の課題は、応募者の情報がスプレッドシートに散らばっていて進捗が見えないことです。",
  "田中さんから、候補としてGreenhouseとWorkableが挙がっています。",
  "コストはWorkableのほうが安いですが、Greenhouseのほうが面接連携が強いという意見が出ました。",
  "セキュリティ要件を満たすか確認する必要があります。",
  "ということで、まずは両ツールのトライアルを申し込む方針で合意しました。",
  "佐藤さんが来週までにセキュリティチェックリストを作成して持ち帰ります。",
];

const AUTO_INTERVAL_MS = 15000;

export default function Home() {
  const t = useTranscription();
  const [autoMode, setAutoMode] = useState(false);
  const analysis = useAnalysis(t.fullText, autoMode ? AUTO_INTERVAL_MS : 0);

  const loadSample = () => {
    t.clear();
    SAMPLE.forEach((line) => t.addManual(line));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 p-4">
      {/* ヘッダー / コントロールバー */}
      <header className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
        <div className="mr-auto flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h1 className="text-lg font-bold text-slate-100">SuperMeeting</h1>
          <span className="hidden text-sm text-slate-400 sm:inline">
            AI 会議ファシリテーター
          </span>
        </div>

        {t.listening ? (
          <button
            onClick={t.stop}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            録音停止
          </button>
        ) : (
          <button
            onClick={t.start}
            disabled={!t.supported}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            title={t.supported ? "" : "このブラウザは音声認識に非対応（Chrome 推奨）"}
          >
            🎙️ 録音開始
          </button>
        )}

        <button
          onClick={() => analysis.analyzeNow(t.fullText)}
          disabled={analysis.analyzing || !t.fullText.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {analysis.analyzing ? "整理中…" : "✨ いま整理する"}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={autoMode}
            onChange={(e) => setAutoMode(e.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
          自動更新（{AUTO_INTERVAL_MS / 1000}秒ごと）
        </label>

        <button
          onClick={loadSample}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          サンプル投入
        </button>

        {(t.segments.length > 0 || analysis.analysis) && (
          <button
            onClick={t.clear}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            クリア
          </button>
        )}
      </header>

      {/* ステータス行 */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {!t.supported && (
          <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300">
            ⚠️ このブラウザは音声認識に非対応です。「サンプル投入」や手入力で試せます（Chrome 推奨）。
          </span>
        )}
        {analysis.analysis && (
          <span className="rounded bg-slate-700 px-2 py-1">
            分析エンジン:{" "}
            {analysis.analysis.engine === "claude" ? "🟢 Claude" : "⚪ ルールベース"}
          </span>
        )}
        {analysis.lastAnalyzedAt && (
          <span>
            最終更新:{" "}
            {new Date(analysis.lastAnalyzedAt).toLocaleTimeString("ja-JP")}
          </span>
        )}
        {t.error && <span className="text-amber-400">{t.error}</span>}
        {analysis.error && <span className="text-red-400">{analysis.error}</span>}
      </div>

      {/* メイン: 左 = 書き起こし / 右 = AI ノート */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="h-[calc(100vh-220px)] min-h-[400px]">
          <TranscriptPanel
            segments={t.segments}
            interim={t.interim}
            onAddManual={t.addManual}
          />
        </div>
        <div className="overflow-y-auto">
          <AnalysisBoard analysis={analysis.analysis} />
        </div>
      </div>
    </main>
  );
}
