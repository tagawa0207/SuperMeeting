"use client";

import { useMemo, useState } from "react";
import { useTranscription } from "@/hooks/useTranscription";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { useResearchFeed } from "@/hooks/useResearchFeed";
import { useAutoResearch } from "@/hooks/useAutoResearch";
import { AppHeader } from "@/components/AppHeader";
import { LiveTicker } from "@/components/LiveTicker";
import { TranscriptDrawer } from "@/components/TranscriptDrawer";
import { TopicRail } from "@/components/TopicRail";
import { FocusStage } from "@/components/FocusStage";
import { EmptyStage } from "@/components/EmptyStage";
import { ResearchFeed } from "@/components/ResearchFeed";
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
  // 自動検索は既定 OFF（発話内容が外部の Web 検索に送られるため、明示的に ON にする設計）。
  const [autoResearch, setAutoResearch] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manualParticipants, setManualParticipants] = useState<string[]>([]);
  const analysis = useAnalysis(t.fullText, autoAnalyze ? AUTO_INTERVAL_MS : 0);
  const research = useResearchFeed();

  // 発話確定に反応する自動リサーチ（高速トリガーレーン）。
  const topicsSummary = useMemo(() => {
    const titles = analysis.analysis?.topics.map((tp) => tp.title) ?? [];
    return titles.length > 0 ? titles.join(" / ") : undefined;
  }, [analysis.analysis]);
  useAutoResearch({
    segments: t.segments,
    topicsSummary,
    enabled: autoResearch,
    runAuto: research.runAuto,
  });

  // Chrome 拡張からの話者付き発話を取り込む。
  const bridge = useExtensionBridge({
    onSegment: (text, speaker, at) => t.ingestSegment(text, speaker, at),
    onInterim: (text, speaker) => t.ingestInterim(text, speaker),
  });
  const extConnected = bridge.connected;

  const lastSegment =
    t.segments.length > 0 ? t.segments[t.segments.length - 1] : null;

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

  const error = t.error || analysis.error;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <AppHeader
        listening={t.listening}
        supported={t.supported}
        extConnected={extConnected}
        lang={t.lang}
        onLangChange={t.setLang}
        onStart={t.start}
        onStop={t.stop}
        analyzing={analysis.analyzing}
        canAnalyze={!!t.fullText.trim()}
        onAnalyze={() => analysis.analyzeNow(t.fullText)}
        autoAnalyze={autoAnalyze}
        onToggleAutoAnalyze={() => setAutoAnalyze((v) => !v)}
        engine={analysis.analysis?.engine ?? null}
        onLoadSample={loadSample}
        onClear={t.clear}
        hasContent={t.segments.length > 0}
      />

      {error && (
        <div className="flex-none border-b border-err-line bg-err-soft px-6 py-1.5 text-[12.5px] text-err">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[290px_1fr_330px] gap-4 px-6 py-[18px]">
        {/* 左: 論点の流れ + 参加者 */}
        <TopicRail
          topics={analysis.analysis?.topics ?? []}
          participants={participants}
          currentSpeaker={t.currentSpeaker}
          onSelectSpeaker={t.setCurrentSpeaker}
          onAddParticipant={(name) =>
            setManualParticipants((prev) =>
              prev.includes(name) ? prev : [...prev, name],
            )
          }
          autoMode={extConnected}
        />

        {/* 中央: フォーカスステージ */}
        {analysis.analysis ? (
          <FocusStage
            analysis={analysis.analysis}
            lastAnalyzedAt={analysis.lastAnalyzedAt}
            onResearch={research.runManual}
          />
        ) : (
          <EmptyStage
            supported={t.supported}
            extConnected={extConnected}
            onStart={t.start}
            onLoadSample={loadSample}
          />
        )}

        {/* 右: ライブリサーチ */}
        <ResearchFeed
          cards={research.cards}
          onRun={research.runManual}
          autoEnabled={autoResearch}
          onToggleAuto={setAutoResearch}
        />
      </div>

      <LiveTicker segment={lastSegment} onOpenDrawer={() => setDrawerOpen(true)} />

      <TranscriptDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        segments={t.segments}
        interim={t.interim}
        interimSpeaker={t.interimSpeaker}
        onAddManual={t.addManual}
      />
    </main>
  );
}
