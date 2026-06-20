// Claude へのプロンプトと、構造化出力（structured outputs）のための JSON スキーマ。

export const SYSTEM_PROMPT = `あなたは優秀な会議ファシリテーターのアシスタントです。
リアルタイムで流れてくる会議の書き起こし（日本語、話者分離なし、認識誤りを含む可能性あり）を読み取り、
ファシリテーターが画面共有して参加者全員と共有するための「議事ノート」を構造化して作成します。

方針:
- 事実に基づいて整理し、書き起こしに無い内容を創作しない。
- 認識誤りと思われる箇所は文脈から自然に補正してよい。
- 要約・論点・決定事項・TODO・未解決の問いを簡潔な日本語で書く。
- topics の status は open（未着手/提起のみ）/ discussing（議論中）/ resolved（結論が出た）から選ぶ。
- todos の owner / due は書き起こしから読み取れない場合は null にする。
- diagram は議論の構造を表す Mermaid の flowchart として出力する（"flowchart TD" で始める）。
  ノードのラベルは短い日本語にし、特殊文字や引用符は避ける。図にできる材料が乏しければ最小限の図でよい。
- 情報が少ない段階では空配列や短い要約で構わない。無理に埋めない。`;

/**
 * structured outputs 用スキーマ。
 * 注意: 文字列長や数値制約は structured outputs では非対応のため使わない。
 * すべてのオブジェクトで additionalProperties:false と required を指定する。
 */
export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "現在の議論の簡潔な要約" },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          status: { type: "string", enum: ["open", "discussing", "resolved"] },
          points: { type: "array", items: { type: "string" } },
        },
        required: ["title", "status", "points"],
        additionalProperties: false,
      },
    },
    decisions: { type: "array", items: { type: "string" } },
    todos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          owner: { type: ["string", "null"] },
          due: { type: ["string", "null"] },
        },
        required: ["task", "owner", "due"],
        additionalProperties: false,
      },
    },
    questions: { type: "array", items: { type: "string" } },
    diagram: {
      type: "string",
      description: "Mermaid flowchart 記法の図（flowchart TD で始める）",
    },
  },
  required: ["summary", "topics", "decisions", "todos", "questions", "diagram"],
  additionalProperties: false,
} as const;

export function buildUserPrompt(transcript: string): string {
  return `次の会議書き起こしを分析し、議事ノートを構造化して出力してください。\n\n--- 書き起こしここから ---\n${transcript}\n--- 書き起こしここまで ---`;
}
