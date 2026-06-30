// Web 調査。Claude の web_search サーバーツールで論点・問いを裏取りする。
import Anthropic from "@anthropic-ai/sdk";
import type { ResearchSource } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const SYSTEM = `あなたは会議ファシリテーターの調査アシスタントです。
与えられた論点や問いについて Web 検索し、日本語で要点を簡潔に（3〜5項目の箇条書き）まとめます。
- 事実と推測を区別し、確度が低い場合はその旨を明記する。
- 会議の意思決定に役立つ観点（選択肢の比較、相場感、注意点など）を優先する。
- 出典は本文に URL を貼らず、検索結果として返るものをそのまま根拠として扱う。`;

export interface WebResearch {
  summary: string;
  sources: ResearchSource[];
}

/** Claude + web_search で調査し、要約と出典リンクを返す。 */
export async function researchWithClaude(query: string): Promise<WebResearch> {
  const client = new Anthropic();

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    // web_search サーバーツール（Opus 4.6+ / Sonnet 4.6 で dynamic filtering 対応）。
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 5 },
    ] as unknown as Anthropic.Messages.ToolUnion[],
    messages: [{ role: "user", content: `次のトピックを調査してください:\n${query}` }],
  });

  let summary = "";
  const sources: ResearchSource[] = [];
  const seen = new Set<string>();

  // 型はSDKバージョン差があるため防御的に走査する。
  for (const block of res.content as unknown as Array<Record<string, unknown>>) {
    if (block.type === "text" && typeof block.text === "string") {
      summary += block.text;
    } else if (
      block.type === "web_search_tool_result" &&
      Array.isArray(block.content)
    ) {
      for (const r of block.content as Array<Record<string, unknown>>) {
        const url = typeof r.url === "string" ? r.url : null;
        if (r.type === "web_search_result" && url && !seen.has(url)) {
          seen.add(url);
          sources.push({
            title: typeof r.title === "string" && r.title ? r.title : url,
            url,
            origin: "web",
          });
        }
      }
    }
  }

  return { summary: summary.trim(), sources };
}
