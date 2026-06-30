// 社内情報検索のプロバイダ抽象。
// 実コネクタ（Slack / Google Drive / Confluence / Jira / Box 等）は、
// それぞれの OAuth・API を使ってこの InternalKnowledgeSource を実装して差し込む。
// 現状は UI とデータフロー確認用のモックを提供する。
import type { ResearchSource } from "@/lib/types";

export interface InternalKnowledgeSource {
  /** 表示名。 */
  name: string;
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
 * 環境に応じて使う社内情報源を選ぶ。
 * 将来: 環境変数や設定に応じて実コネクタ（複数）を束ねた実装を返す。
 */
export function getInternalSource(): InternalKnowledgeSource {
  return mockInternalSource;
}
