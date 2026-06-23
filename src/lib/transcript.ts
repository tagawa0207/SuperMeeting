// 書き起こしの整形ユーティリティ。
import type { TranscriptSegment } from "./types";
import { UNKNOWN_SPEAKER } from "./speakers";

/**
 * AI 分析へ渡すための話者ラベル付きテキストを生成する。
 * 各行を「話者名: 発言」の形にすることで、AI が誰の発言かを踏まえて
 * 要約・決定事項・TODO 担当の振り分けを行えるようにする。
 */
export function formatTranscriptForAI(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `${s.speaker || UNKNOWN_SPEAKER}: ${s.text}`)
    .join("\n");
}

/** これまでに登場した話者名の一覧（登場順）。 */
export function knownSpeakers(segments: TranscriptSegment[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of segments) {
    if (s.speaker && !seen.has(s.speaker)) {
      seen.add(s.speaker);
      result.push(s.speaker);
    }
  }
  return result;
}
