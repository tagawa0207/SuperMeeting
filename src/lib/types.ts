// SuperMeeting のドメイン型定義。
// 音声書き起こし → AI 分析 → ファシリテーション表示、を貫く共通の型。

/** 書き起こしの 1 発話。 */
export interface TranscriptSegment {
  id: string;
  /** 確定済みテキスト（暫定結果は別管理）。 */
  text: string;
  /** 取得時刻（ミリ秒）。 */
  at: number;
  /** 話者ラベル（Web Speech API では話者分離できないため任意）。 */
  speaker?: string;
}

export type TopicStatus = "open" | "discussing" | "resolved";

/** 議論中の論点。 */
export interface Topic {
  title: string;
  status: TopicStatus;
  /** 論点に関する主要な発言・観点。 */
  points: string[];
}

/** 抽出された TODO。 */
export interface Todo {
  task: string;
  /** 担当者（不明なら null）。 */
  owner: string | null;
  /** 期限（不明なら null）。 */
  due: string | null;
}

/**
 * AI（または heuristic フォールバック）が議事録から組み立てた構造化ノート。
 * ファシリテーション画面の各パネルはこの形に対して描画する。
 */
export interface MeetingAnalysis {
  /** 現時点の議論の要約。 */
  summary: string;
  /** 論点の一覧。 */
  topics: Topic[];
  /** 決定事項。 */
  decisions: string[];
  /** 抽出された TODO。 */
  todos: Todo[];
  /** 未解決の問い・確認事項。 */
  questions: string[];
  /** 議論構造を表す Mermaid 記法の図（描画は flowchart を想定）。 */
  diagram: string;
  /** この分析を生成したエンジン。UI でバッジ表示する。 */
  engine: "claude" | "heuristic";
}

/** /api/analyze のリクエストボディ。 */
export interface AnalyzeRequest {
  transcript: string;
}

/** 調査の対象。web=Web検索 / internal=社内情報源。 */
export type ResearchTarget = "web" | "internal";

/** 調査結果の 1 件の根拠（Web または社内情報源）。 */
export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  /** 情報の出所。web=Web検索 / internal=社内情報源。 */
  origin: ResearchTarget;
}

/**
 * 調査フィードの 1 カード。
 * target（web/internal）ごとに独立して非同期に到着する（束ねない）。
 */
export interface ResearchCard {
  id: string;
  /** 調査クエリ（Web 用の自然文）。 */
  query: string;
  /** 社内検索（Slack / Confluence）用のキーワード列（自動トリガー時に付与。フェーズ③）。 */
  slackKeywords?: string;
  target: ResearchTarget;
  status: "queued" | "searching" | "done" | "error";
  trigger: "auto" | "manual";
  /** 発端となった発言（自動トリガー時のみ）。 */
  triggeredBy?: { segmentId: string; quote: string };
  /** カード生成時刻（ミリ秒）。 */
  at: number;
  /** 調査の要約。status=error の場合はエラーメッセージ。 */
  summary?: string;
  sources: ResearchSource[];
}

/** 調査（論点・問いの裏取り）の結果。 */
export interface ResearchResult {
  query: string;
  /** 調査の要約（日本語）。 */
  summary: string;
  sources: ResearchSource[];
  /** Web 調査を生成したエンジン。 */
  engine: "claude" | "mock";
  /** 社内検索に関する注記（モックである旨など）。 */
  internalNote?: string;
}

/** /api/research のリクエストボディ。target で片方のみを実行する。 */
export interface ResearchRequest {
  query: string;
  target: ResearchTarget;
}

/** 自動トリガーの検索対象。both は web / internal の 2 枚のカードになる。 */
export type TriggerTarget = ResearchTarget | "both";

/** /api/trigger のリクエストボディ。直近発話のウィンドウと文脈を渡す。 */
export interface TriggerRequest {
  /** 直近 6〜10 発話のスライディングウィンドウ。 */
  segments: { id: string; speaker?: string; text: string }[];
  /** 最新分析の論点要約（あれば）。 */
  topicsSummary?: string;
  /** 実行済みクエリの一覧（重複検索の抑制に使う）。 */
  recentQueries: string[];
}

/** トリガー判定が生成した検索タスク 1 件。 */
export interface TriggerTask {
  /** 何を明らかにしたいか（Web 検索用の自然文）。 */
  intent: string;
  /** 社内検索（Slack / Confluence 共通）用の短いキーワード列（2〜4語。in:/after: 修飾子は Slack のみ）。 */
  slackKeywords: string;
  target: TriggerTarget;
  /** 発端となった発言の引用。 */
  triggeredBy: string;
}

/** /api/trigger のレスポンス。 */
export interface TriggerResult {
  shouldSearch: boolean;
  tasks: TriggerTask[];
}
