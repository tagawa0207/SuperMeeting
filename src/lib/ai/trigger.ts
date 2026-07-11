// 発話から検索要否を高速判定するトリガーレーン。
// 15 秒周期の分析ループとは独立に、毎発話（実質 2〜3 秒に 1 回）Haiku で判定する。
import Anthropic from "@anthropic-ai/sdk";
import type { TriggerRequest, TriggerResult } from "@/lib/types";
import { hasClaudeKey } from "./claude";

// 判定は速度・コスト優先で Haiku を既定にする。
const TRIGGER_MODEL = process.env.ANTHROPIC_TRIGGER_MODEL || "claude-haiku-4-5";
/** 1 回の判定で出す検索タスクの上限。 */
const MAX_TASKS = 2;

const TRIGGER_SYSTEM_PROMPT = `あなたは会議のリアルタイム・リサーチアシスタントの「トリガー判定」担当です。
直近の発話を読み、いま Web / 社内ナレッジ（Slack・Confluence）を検索する価値があるかを即座に判定します。
検索結果は画面共有中の会議ボードに表示されるため、的外れな検索はノイズになります。

判定の方針:
- 検索する価値があるときだけ shouldSearch=true にする。迷ったら false。
- 雑談・相槌・挨拶・議事進行だけの発話（「なるほど」「では次に」「ありがとうございます」等）は必ず shouldSearch=false。
- 検索する価値がある例:
  - 事実確認が必要な主張（「〜のはず」「〜だと思う」「〜と聞いた」）
  - 固有名詞（製品・企業・技術）や数字への疑問
  - 「〜って何?」「〜はどうなってる?」という質問
  - 過去の経緯・社内の決定・以前の議論への言及（→ internal 向け）
  - 相場・比較・技術情報・最新動向への言及（→ web 向け）
- 「実行済みの検索クエリ」と重複・類似する検索タスクは出さない。同じ話題の言い換えも出さない。
- tasks は多くても ${MAX_TASKS} 件。1 件で足りるなら 1 件にする。shouldSearch=false のとき tasks は空配列。

クエリの作り方（検索品質の要）:
- intent: Web 検索用の自然文。何を明らかにしたいかが分かる一文にする。
- slackKeywords: 社内検索（Slack・Confluence 共通）用の 2〜4 語のキーワード列（スペース区切り）。
  社内検索はキーワードマッチのため自然文では当たらない。固有名詞を優先し、必要なら in:チャンネル名 / after:日付 の修飾子を使ってよい（修飾子は Slack のみに効き、Confluence 検索では自動除去される）。
- target: Web の情報が有用なら "web"、社内の経緯・ナレッジが有用なら "internal"、両方なら "both"。
- triggeredBy: 発端となった発言をそのまま引用する。`;

/**
 * structured outputs 用スキーマ。
 * 注意: 文字列長・数値制約は非対応。全オブジェクトに additionalProperties:false と required を付ける。
 */
const TRIGGER_SCHEMA = {
  type: "object",
  properties: {
    shouldSearch: {
      type: "boolean",
      description: "いま検索する価値があるか",
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          intent: { type: "string", description: "Web 検索用の自然文クエリ" },
          slackKeywords: {
            type: "string",
            description: "社内検索（Slack・Confluence 共通）用の 2〜4 語のキーワード列",
          },
          target: { type: "string", enum: ["web", "internal", "both"] },
          triggeredBy: {
            type: "string",
            description: "発端となった発言の引用",
          },
        },
        required: ["intent", "slackKeywords", "target", "triggeredBy"],
        additionalProperties: false,
      },
    },
  },
  required: ["shouldSearch", "tasks"],
  additionalProperties: false,
} as const;

const NO_SEARCH: TriggerResult = { shouldSearch: false, tasks: [] };

function buildTriggerPrompt(input: TriggerRequest): string {
  const lines = input.segments
    .map((s) => `${s.speaker || "不明"}: ${s.text}`)
    .join("\n");
  const recent = input.recentQueries.length
    ? input.recentQueries.map((q) => `- ${q}`).join("\n")
    : "（なし）";
  const topics = input.topicsSummary
    ? `\n現在の議論の論点: ${input.topicsSummary}\n`
    : "";
  return `直近の発話（下ほど新しい）:\n${lines}\n${topics}
実行済みの検索クエリ（これらと重複・類似する検索は不要）:
${recent}

最新の発話を中心に、いま検索する価値があるか判定してください。`;
}

/**
 * 直近発話から検索タスクを判定する。
 * ANTHROPIC_API_KEY 未設定時は常に shouldSearch=false（自動検索は静かに無効化）。
 */
export async function runTrigger(input: TriggerRequest): Promise<TriggerResult> {
  if (!hasClaudeKey()) return NO_SEARCH;

  const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から読む
  // 注意: Haiku 4.5 は effort パラメータ非対応のため format のみ指定する。
  const response = await client.messages.create({
    model: TRIGGER_MODEL,
    max_tokens: 1024,
    output_config: {
      format: { type: "json_schema", schema: TRIGGER_SCHEMA },
    },
    system: TRIGGER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildTriggerPrompt(input) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return NO_SEARCH;

  const parsed = JSON.parse(textBlock.text) as TriggerResult;
  if (!parsed.shouldSearch) return NO_SEARCH;
  const tasks = parsed.tasks
    .filter((t) => t.intent.trim() || t.slackKeywords.trim())
    .slice(0, MAX_TASKS);
  return { shouldSearch: tasks.length > 0, tasks };
}
