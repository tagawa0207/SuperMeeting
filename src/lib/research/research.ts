// 調査の実行: Web 調査（Claude）と社内情報検索（プロバイダ）を target ごとに独立実行する。
// web と internal は束ねない（最速の社内検索が最遅の Web 検索に引きずられるのを防ぐ）。
import type { ResearchResult } from "@/lib/types";
import { hasClaudeKey } from "@/lib/ai/claude";
import { researchWithClaude } from "./web";
import { getInternalSources } from "./internal";

/** Web 調査のみを実行する。キー未設定・失敗時はモック文言にフォールバック。 */
export async function runWebResearch(query: string): Promise<ResearchResult> {
  if (hasClaudeKey()) {
    try {
      const web = await researchWithClaude(query);
      return {
        query,
        summary: web.summary,
        sources: web.sources,
        engine: "claude",
      };
    } catch (err) {
      console.error("Web 調査に失敗:", err);
    }
  }
  return {
    query,
    summary: `「${query}」の Web 調査は ANTHROPIC_API_KEY を設定すると有効になります（Claude の web_search を使用）。`,
    sources: [],
    engine: "mock",
  };
}

/** 社内情報検索のみを実行する。有効なコネクタを並列実行して 1 枚のカードに束ねる。 */
export async function runInternalResearch(
  query: string,
): Promise<ResearchResult> {
  const internalSources = getInternalSources();
  const sources = (
    await Promise.all(internalSources.map((s) => s.search(query)))
  ).flat();
  const isMock =
    internalSources.length === 1 && internalSources[0].name === "mock";
  // 0 件のとき無言だと「検索したが該当なし」がカード上で分からないため明示する。
  const summary =
    sources.length === 0 && !isMock
      ? `社内に該当する情報は見つかりませんでした（検索範囲: ${internalSources
          .map((s) => s.scope ?? s.name)
          .join("、")}）。`
      : "";
  return {
    query,
    summary,
    sources,
    engine: "mock",
    internalNote: isMock
      ? "社内検索はモックです（Drive / Slack / Confluence 等の連携設定で実データに差し替え可能）"
      : undefined,
  };
}
