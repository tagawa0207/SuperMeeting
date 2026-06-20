// 分析エンジンの選択。キーがあれば Claude、無ければ heuristic。
// Claude 呼び出しが失敗した場合も heuristic にフォールバックして必ず結果を返す。
import type { MeetingAnalysis } from "@/lib/types";
import { analyzeWithClaude, hasClaudeKey } from "./claude";
import { analyzeHeuristic } from "./heuristic";

export async function analyzeTranscript(
  transcript: string,
): Promise<MeetingAnalysis> {
  if (hasClaudeKey()) {
    try {
      return await analyzeWithClaude(transcript);
    } catch (err) {
      console.error("Claude 分析に失敗。heuristic にフォールバックします:", err);
    }
  }
  return analyzeHeuristic(transcript);
}
