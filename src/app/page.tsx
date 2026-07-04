"use client";

import { useMemo, useState } from "react";
import { useTranscription } from "@/hooks/useTranscription";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { useResearch } from "@/hooks/useResearch";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { ResearchPanel } from "@/components/ResearchPanel";
import { SpeakerBar } from "@/components/SpeakerBar";
import { knownSpeakers } from "@/lib/transcript";

// デモ用のサンプル会議（話者付き。マイク/拡張が無くても話者分離の動きを確認できる）。
const SAMPLE: { speaker: string; text: string }[] = [
  { speaker: "司会", text: "今日は新しい採用管理ツールの導入について議論します。" },
  { speaker: "田中", text: "現状の課題は、応募者の情報が散らばっていて進捗が見えないことです。" },
  { speaker: "田中", text: "候補としてGreenhouseとWorkableが挙がっています。" },
  { speaker: "佐藤", text: "コストはWorkableのほうが安いと思います。" },
  { speaker: "鈴木", text: "ただ面接連携はGreenhouseのほうが強いという印象です。" },
  { speaker: "佐藤", text: "セキュリティ要件を満たすか確認する必要がありますね。" },
  { speaker: "司会", text: "ということで、まずは両ツールのトライアルを申し込む方針で合意しました。" },
  { speaker: "佐藤", text: "私が来週までにセキュリティチェックリストを作成して持ち帰ります。" },
];

const AUTO_INTERVAL_MS = 15000;

export default function Home() {
  const t = useTranscription();
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [manualParticipants, setManualParticipants] = useState<string[]>([]);
  const analysis = useAnalysis(t.fullText, autoAnalyze ? AUTO_INTERVAL_MS : 0);
  const research = useResearch();

  // Chrome 拡張からの話者付き発話を取り込む。
  const bridge = useExtensionBridge({
    onSegment: (text, speaker, at) => t.ingestSegment(text, speaker, at),
    onInterim: (text, speaker) => t.ingestInterim(text, speaker),
  });
  const extConnected = bridge.connected;

  // 参加者一覧 = 登場済み話者 + 手動追加。
  const participants = useMemo(() => {
    const set = new Set<string>([
      ...knownSpeakers(t.segments),
      ...manualParticipants,
    ]);
    return [...set];
  }, [t.segments, manualParticipants]);

  const loadSample = () => {
    t.clear();
    SAMPLE.forEach((line, i) =>
      t.ingestSegment(line.text, line.speaker, Date.now() + i),
    );
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

        <select
          value={t.lang}
          onChange={(e) => t.setLang(e.target.value)}
          disabled={t.listening}
          title="音声認識の言語"
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-200 disabled:opacity-40"
        >
          <option value="ja-JP">🇯🇵 日本語</option>
          <option value="en-US">🇺🇸 English</option>
        </select>

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
            disabled={!t.supported || extConnected}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              extConnected
                ? "拡張から受信中のため、ローカル録音は不要です"
                : t.supported
                  ? ""
                  : "このブラウザは音声認識に非対応（Chrome 推奨）"
            }
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
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
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

      {/* 話者バー */}
      <SpeakerBar
        speakers={participants}
        currentSpeaker={t.currentSpeaker}
        onSelect={t.setCurrentSpeaker}
        onAdd={(name) => setManualParticipants((prev) => [...prev, name])}
        autoMode={extConnected}
      />

      {/* ステータス行 */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span
          className={`rounded px-2 py-1 ${
            extConnected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {extConnected
            ? "🔌 Meet 拡張 接続中（話者を自動付与）"
            : "🔌 Meet 拡張 未接続（手動/サンプルで利用可）"}
        </span>
        {!t.supported && !extConnected && (
          <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300">
            ⚠️ このブラウザは音声認識に非対応です（Chrome 推奨）。
          </span>
        )}
        {analysis.analysis && (
          <span className="rounded bg-slate-700 px-2 py-1">
            分析エンジン:{" "}
            {analysis.analysis.engine === "claude"
              ? "🟢 Claude"
              : "⚪ ルールベース"}
          </span>
        )}
        {analysis.lastAnalyzedAt && (
          <span>
            最終更新:{" "}
            {new Date(analysis.lastAnalyzedAt).toLocaleTimeString("ja-JP")}
          </span>
        )}
        {t.error && <span className="text-amber-400">{t.error}</span>}
        {analysis.error && (
          <span className="text-red-400">{analysis.error}</span>
        )}
      </div>

      {/* メイン: 左 = 書き起こし / 右 = AI ノート */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="h-[calc(100vh-280px)] min-h-[400px]">
          <TranscriptPanel
            segments={t.segments}
            interim={t.interim}
            interimSpeaker={t.interimSpeaker}
            onAddManual={t.addManual}
          />
        </div>
        <div className="space-y-4 overflow-y-auto">
          <AnalysisBoard
            analysis={analysis.analysis}
            onResearch={research.run}
          />
          <ResearchPanel
            result={research.result}
            loading={research.loading}
            error={research.error}
            activeQuery={research.activeQuery}
            onRun={research.run}
          />
        </div>
      </div>
    </main>
  );
}
