// 調査のオーケストレーション: Web 調査（Claude）＋ 社内情報検索（プロバイダ）。
import type { ResearchResult, ResearchSource } from "@/lib/types";
import { hasClaudeKey } from "@/lib/ai/claude";
import { researchWithClaude } from "./web";
import { getInternalSource } from "./internal";

export async function runResearch(query: string): Promise<ResearchResult> {
  let summary = "";
  let webSources: ResearchSource[] = [];
  let engine: "claude" | "mock" = "mock";

  if (hasClaudeKey()) {
    try {
      const web = await researchWithClaude(query);
      summary = web.summary;
      webSources = web.sources;
      engine = "claude";
    } catch (err) {
      console.error("Web 調査に失敗:", err);
    }
  }

  if (engine === "mock") {
    summary = `「${query}」の Web 調査は ANTHROPIC_API_KEY を設定すると有効になります（Claude の web_search を使用）。`;
  }

  // 社内情報検索（現状モック）。失敗しても全体は返す。
  const internalSource = getInternalSource();
  const internalSources = await internalSource
    .search(query)
    .catch(() => [] as ResearchSource[]);

  return {
    query,
    summary,
    sources: [...webSources, ...internalSources],
    engine,
    internalNote:
      internalSource.name === "mock"
        ? "社内検索はモックです（Drive / Slack / Confluence 等の連携設定で実データに差し替え可能）"
        : undefined,
  };
}
