// API キーが無いときのルールベース・フォールバック分析。
// 完璧ではないが「出荷時から動く」ことを保証し、UI / データの流れを確認できる。
import type { MeetingAnalysis, Todo } from "@/lib/types";

const SENTENCE_SPLIT = /(?<=[。．!?！？\n])/;

function sentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// TODO っぽい文を拾うための手がかり。
const TODO_HINTS = [
  "todo",
  "やる",
  "やります",
  "対応",
  "宿題",
  "持ち帰",
  "確認します",
  "までに",
  "次回まで",
  "アクション",
  "担当",
];

const DECISION_HINTS = [
  "決定",
  "決まり",
  "決めました",
  "合意",
  "確定",
  "ということで",
  "方針は",
];

const QUESTION_HINTS = ["?", "？", "どう", "どうする", "べき", "確認したい", "懸念", "課題"];

/** 「話者名: 発言」形式の行から話者名と本文を分離する。 */
function parseSpeakerPrefix(line: string): { speaker: string | null; text: string } {
  const m = line.match(/^\s*([^:：\n]{1,20})[:：]\s*(.+)$/s);
  if (m) return { speaker: m[1].trim(), text: m[2].trim() };
  return { speaker: null, text: line };
}

function extractOwner(line: string): string | null {
  // まず行頭の話者名（発言者）を担当候補にする。
  const { speaker, text } = parseSpeakerPrefix(line);
  if (speaker && speaker !== "不明") return speaker;
  // 次に本文中の「〇〇さん」を拾う。
  const m = text.match(/([一-龯ぁ-んァ-ヶA-Za-z]+)さん/);
  return m ? `${m[1]}さん` : null;
}

export function analyzeHeuristic(transcript: string): MeetingAnalysis {
  const all = sentences(transcript);

  const decisions = all.filter((s) => DECISION_HINTS.some((h) => s.includes(h)));

  const todos: Todo[] = all
    .filter((s) => TODO_HINTS.some((h) => s.toLowerCase().includes(h)))
    .slice(0, 12)
    .map((s) => ({
      // task は本文のみ（行頭の話者名は owner に回す）。
      task: parseSpeakerPrefix(s).text,
      owner: extractOwner(s),
      due: null,
    }));

  const questions = all
    .filter((s) => QUESTION_HINTS.some((h) => s.includes(h)))
    .slice(0, 10);

  // 直近の発言を中心に簡易要約。
  const recent = all.slice(-6).join(" ");
  const summary =
    recent.length > 0
      ? `直近の発言: ${recent.slice(0, 280)}`
      : "まだ発言がありません。";

  // 論点は「？」を含む文や課題系の文を見出しにした簡易版。
  const topics = questions.slice(0, 5).map((q) => ({
    title: q.replace(/[。．!?！？]+$/, "").slice(0, 40),
    status: "discussing" as const,
    points: [] as string[],
  }));

  const diagram = buildDiagram(decisions, questions);

  return {
    summary,
    topics,
    decisions: decisions.slice(0, 10),
    todos,
    questions,
    diagram,
    engine: "heuristic",
  };
}

function sanitize(label: string): string {
  return label
    .replace(/[「」"'`(){}\[\]]/g, "")
    .replace(/[\n\r]/g, " ")
    .slice(0, 24);
}

function buildDiagram(decisions: string[], questions: string[]): string {
  const lines = ["flowchart TD", "  meeting[会議]"];
  questions.slice(0, 4).forEach((q, i) => {
    lines.push(`  q${i}["論点: ${sanitize(q)}"]`);
    lines.push(`  meeting --> q${i}`);
  });
  decisions.slice(0, 4).forEach((d, i) => {
    lines.push(`  d${i}["決定: ${sanitize(d)}"]`);
    lines.push(`  meeting --> d${i}`);
  });
  return lines.join("\n");
}
