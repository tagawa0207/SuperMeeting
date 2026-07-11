// Confluence コネクタ: Cloud REST API の CQL 検索（siteSearch）でページ・ブログ記事を検索する。
// 認証はメールアドレス + API トークンの Basic 認証
// （CONFLUENCE_BASE_URL / CONFLUENCE_EMAIL / CONFLUENCE_API_TOKEN の 3 点セットで有効化）。
import type { ResearchSource } from "@/lib/types";
import type { InternalKnowledgeSource } from "./internal";

/** search API のレスポンス 1 件（利用するフィールドのみ）。 */
export interface ConfluenceSearchResult {
  /** タイトル。検索語のハイライトマーカー（@@@hl@@@）が入ることがある。 */
  title?: string;
  /** 本文の抜粋。ハイライトマーカー・HTML エンティティを含む。 */
  excerpt?: string;
  /** ページへの相対パス（/spaces/... 形式）。 */
  url?: string;
  /** 所属スペース。 */
  resultGlobalContainer?: { title?: string };
  /** 最終更新（ISO 8601）。 */
  lastModified?: string;
}

interface ConfluenceSearchResponse {
  results?: ConfluenceSearchResult[];
}

const SNIPPET_MAX = 150;
const MAX_RESULTS = 5;

/** Confluence 連携が設定済みか（3 つの環境変数が揃っているか）。 */
export function hasConfluenceConfig(): boolean {
  return Boolean(
    process.env.CONFLUENCE_BASE_URL &&
      process.env.CONFLUENCE_EMAIL &&
      process.env.CONFLUENCE_API_TOKEN,
  );
}

/**
 * Slack 検索用の修飾子（in:/from:/after: 等）を取り除く。
 * トリガーが生成する slackKeywords は Slack と共用のため、Confluence には通用しない
 * 修飾子が混ざることがある（CQL の siteSearch にそのまま入るとノイズになる）。
 */
export function stripSlackModifiers(keywords: string): string {
  return keywords
    .replace(/\b(?:in|from|to|with|after|before|on|during|has|is):\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** CQL の文字列リテラル用エスケープ（" と \ をエスケープ）。 */
export function escapeCql(value: string): string {
  return value.replace(/([\\"])/g, "\\$1");
}

/**
 * 検索 CQL を組み立てる。
 * 個人スペース（space.type=personal）は既定で除外する。
 * 個人の API トークンの検索結果には本人の個人スペース（下書き・私的メモ）が混ざるため、
 * 画面共有中のボードに表示される事故を防ぐ（Slack の public チャンネル限定と同じ趣旨）。
 */
export function buildCql(query: string, includePersonal: boolean): string {
  const clauses = [
    `siteSearch ~ "${escapeCql(query)}"`,
    `type in ("page", "blogpost")`,
  ];
  if (!includePersonal) clauses.push(`space.type = "global"`);
  return clauses.join(" AND ");
}

/** excerpt / title のハイライトマーカーと HTML エンティティを除去し、150 字程度で切る。 */
export function formatConfluenceSnippet(text: string): string {
  const readable = text
    .replace(/@@@hl@@@|@@@endhl@@@/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return readable.length > SNIPPET_MAX
    ? `${readable.slice(0, SNIPPET_MAX)}…`
    : readable;
}

/** lastModified（ISO 8601）を YYYY-MM-DD に整形する。 */
export function formatConfluenceDate(iso: string | undefined): string {
  if (!iso) return "日付不明";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "日付不明";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 1 検索結果を ResearchSource へ変換する。 */
export function resultToSource(
  result: ConfluenceSearchResult,
  baseUrl: string,
): ResearchSource {
  const space = result.resultGlobalContainer?.title;
  const title = formatConfluenceSnippet(result.title ?? "無題");
  return {
    title: `${space ? `[${space}] ` : ""}${title}（${formatConfluenceDate(result.lastModified)}）`,
    url: result.url ? `${baseUrl.replace(/\/$/, "")}${result.url}` : "#",
    snippet: result.excerpt
      ? formatConfluenceSnippet(result.excerpt)
      : undefined,
    origin: "internal",
  };
}

/**
 * Confluence 検索を実行し ResearchSource 群を返す。
 * エラー時（トークン無効・レートリミット等）は例外を投げず空配列を返す。
 */
export const confluenceInternalSource: InternalKnowledgeSource = {
  name: "confluence",
  scope: "Confluence 一般スペース",
  async search(query: string): Promise<ResearchSource[]> {
    const baseUrl = process.env.CONFLUENCE_BASE_URL;
    const email = process.env.CONFLUENCE_EMAIL;
    const token = process.env.CONFLUENCE_API_TOKEN;
    if (!baseUrl || !email || !token) return [];
    const keywords = stripSlackModifiers(query);
    if (!keywords) return [];
    try {
      const includePersonal = process.env.CONFLUENCE_INCLUDE_PERSONAL === "1";
      const params = new URLSearchParams({
        cql: buildCql(keywords, includePersonal),
        limit: String(MAX_RESULTS),
      });
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/rest/api/search?${params}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) {
        console.error("Confluence 検索エラー:", res.status, await res.text());
        return [];
      }
      const data = (await res.json()) as ConfluenceSearchResponse;
      return (data.results ?? []).map((r) => resultToSource(r, baseUrl));
    } catch (err) {
      console.error("Confluence 検索に失敗:", err);
      return [];
    }
  },
};
