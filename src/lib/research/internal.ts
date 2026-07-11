// 社内情報検索のプロバイダ抽象。
// 実コネクタ（Slack / Google Drive / Confluence / Jira / Box 等）は、
// それぞれの OAuth・API を使ってこの InternalKnowledgeSource を実装して差し込む。
// 実装済み: Slack（./slack.ts、SLACK_USER_TOKEN で有効化）、
//           Confluence（./confluence.ts、CONFLUENCE_BASE_URL 等 3 点セットで有効化）。
// どちらも未設定のときはモック。
import type { ResearchSource } from "@/lib/types";
import { slackInternalSource } from "./slack";
import { confluenceInternalSource, hasConfluenceConfig } from "./confluence";

export interface InternalKnowledgeSource {
  /** 表示名。 */
  name: string;
  /** 検索範囲の注記（0 件時のメッセージ等に使う）。 */
  scope?: string;
  /** クエリに関連する社内ドキュメントを返す。 */
  search(query: string): Promise<ResearchSource[]>;
}

/**
 * モック社内情報源。
 * 実際の連携（要 OAuth/認証）が未設定でも、UI 上で「社内ヒット」の見え方を確認できる。
 */
export const mockInternalSource: InternalKnowledgeSource = {
  name: "mock",
  async search(query: string): Promise<ResearchSource[]> {
    const q = query.slice(0, 30);
    return [
      {
        title: `【社内Wiki（モック）】${q} に関する過去の議論`,
        url: "#",
        snippet: "実際の社内検索は連携設定（Drive/Slack/Confluence 等）で有効になります。",
        origin: "internal",
      },
      {
        title: `【Slack #general（モック）】${q} の関連スレッド`,
        url: "#",
        snippet: "モックデータです。",
        origin: "internal",
      },
    ];
  },
};

/**
 * 環境に応じて有効な社内情報源を列挙する。
 * 複数の実コネクタが有効な場合は呼び出し側で並列実行して 1 枚の internal カードに束ねる
 * （Slack / Confluence はどちらも 1 秒前後で、束ねてもレイテンシ目標 2〜3 秒に収まる）。
 * 実コネクタが 1 つも無いときはモックのみを返す。
 */
export function getInternalSources(): InternalKnowledgeSource[] {
  const sources: InternalKnowledgeSource[] = [];
  if (process.env.SLACK_USER_TOKEN) sources.push(slackInternalSource);
  if (hasConfluenceConfig()) sources.push(confluenceInternalSource);
  return sources.length > 0 ? sources : [mockInternalSource];
}
