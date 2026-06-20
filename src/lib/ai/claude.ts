// Claude API を使った高精度分析。ANTHROPIC_API_KEY が設定されているときに使う。
import Anthropic from "@anthropic-ai/sdk";
import type { MeetingAnalysis } from "@/lib/types";
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

// 既定は最も高性能な Opus 4.8。コスト/レイテンシ重視なら ANTHROPIC_MODEL で上書き。
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * 書き起こしを Claude で分析し構造化ノートを返す。
 * structured outputs により出力は ANALYSIS_SCHEMA に必ず一致する。
 */
export async function analyzeWithClaude(
  transcript: string,
): Promise<MeetingAnalysis> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY を環境から読む

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // 会議中はレスポンス速度を優先。effort:low でも構造化出力の品質は十分。
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(transcript) }],
  });

  // structured outputs では最初の text ブロックが有効な JSON になる。
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude から有効な応答が得られませんでした");
  }

  const parsed = JSON.parse(textBlock.text) as Omit<MeetingAnalysis, "engine">;
  return { ...parsed, engine: "claude" };
}
