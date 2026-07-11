// Slack コネクタ: Web API の search.messages でワークスペースを検索する。
// 認証はユーザートークン xoxp（SLACK_USER_TOKEN、スコープ search:read）。
// 検索系スコープは bot トークン（xoxb）では呼べないため、ユーザートークンを使う。
import type { ResearchSource } from "@/lib/types";
import type { InternalKnowledgeSource } from "./internal";

/** search.messages のマッチ 1 件（利用するフィールドのみ）。 */
export interface SlackMatch {
  channel?: {
    name?: string;
    is_private?: boolean;
    is_im?: boolean;
    is_mpim?: boolean;
  };
  /** 発言者の表示名。 */
  username?: string;
  /** 発言者のユーザー ID（username が無いときのフォールバック）。 */
  user?: string;
  ts?: string;
  text?: string;
  permalink?: string;
}

interface SlackSearchResponse {
  ok: boolean;
  error?: string;
  messages?: { matches?: SlackMatch[] };
}

const SNIPPET_MAX = 150;
/** 1 メッセージから展開するメッセージ内リンクの上限。 */
const MAX_LINKS_PER_MESSAGE = 2;

/**
 * public チャンネルのマッチだけを通すフィルタ。
 * 個人トークン（xoxp）の検索結果には DM・プライベートチャンネルのメッセージが混ざるため、
 * 画面共有中のボードに DM の断片が表示される事故を防ぐ目的で既定 ON。
 * SLACK_INCLUDE_PRIVATE=1 のときだけ無効化できる。
 */
export function isPublicChannelMatch(match: SlackMatch): boolean {
  const ch = match.channel;
  if (!ch) return false;
  return !(ch.is_private || ch.is_im || ch.is_mpim);
}

/** ts（"1751234567.000200" 等の epoch 秒）を YYYY-MM-DD に整形する。 */
export function formatSlackDate(ts: string | undefined): string {
  const seconds = Number(ts);
  if (!Number.isFinite(seconds) || seconds <= 0) return "日付不明";
  const d = new Date(seconds * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Slack 記法（<@U…> / <#C…|name> / <URL|label> / HTML エンティティ）を可読化し、150 字程度で切る。 */
export function formatSlackSnippet(text: string): string {
  const readable = text
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^|>]+)>/g, "$1")
    .replace(/<#\w+\|([^>]+)>/g, "#$1")
    .replace(/<#(\w+)>/g, "#$1")
    .replace(/<@\w+\|([^>]+)>/g, "@$1")
    .replace(/<@(\w+)>/g, "@$1")
    .replace(/<!(\w+)(?:\|[^>]*)?>/g, "@$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return readable.length > SNIPPET_MAX
    ? `${readable.slice(0, SNIPPET_MAX)}…`
    : readable;
}

/** text 中の <https://…> / <https://…|ラベル> 形式のリンクを抽出する。 */
export function extractMessageLinks(
  text: string,
): { url: string; label?: string }[] {
  const links: { url: string; label?: string }[] = [];
  for (const m of text.matchAll(/<(https?:\/\/[^|>]+)(?:\|([^>]+))?>/g)) {
    links.push({ url: m[1], label: m[2] });
  }
  return links;
}

/**
 * 1 マッチを ResearchSource 群へ変換する。
 * 本体に加え、メッセージ内リンクも個別ソースとして展開する
 * （Slack メッセージに貼られた Confluence 等が本命の一次情報であることが多いため）。
 */
export function matchToSources(match: SlackMatch): ResearchSource[] {
  const channel = match.channel?.name ?? "unknown";
  const author = match.username || match.user || "不明";
  const text = match.text ?? "";
  const sources: ResearchSource[] = [
    {
      title: `#${channel} — ${author}（${formatSlackDate(match.ts)}）`,
      url: match.permalink ?? "#",
      snippet: formatSlackSnippet(text),
      origin: "internal",
    },
  ];
  for (const link of extractMessageLinks(text).slice(
    0,
    MAX_LINKS_PER_MESSAGE,
  )) {
    sources.push({
      title: link.label || link.url,
      url: link.url,
      snippet: `Slack メッセージ（#${channel}）内のリンク`,
      origin: "internal",
    });
  }
  return sources;
}

/**
 * Slack 検索を実行し ResearchSource 群を返す。
 * エラー時（トークン無効・レートリミット等）は例外を投げず空配列を返す。
 * レートリミット注意: search.messages は Tier 2（20 リクエスト/分程度）で上限に当たりやすい。
 * 自動トリガーと組み合わせる場合は、呼び出し側でクエリキャッシュ・同時実行上限を設けること。
 */
export const slackInternalSource: InternalKnowledgeSource = {
  name: "slack",
  scope: "Slack public チャンネル",
  async search(query: string): Promise<ResearchSource[]> {
    const token = process.env.SLACK_USER_TOKEN;
    if (!token) return [];
    try {
      const params = new URLSearchParams({
        query,
        count: "5",
        highlight: "false",
      });
      const res = await fetch(
        `https://slack.com/api/search.messages?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as SlackSearchResponse;
      if (!data.ok) {
        console.error("Slack search.messages エラー:", data.error);
        return [];
      }
      const matches = data.messages?.matches ?? [];
      // public チャンネル限定フィルタ（既定 ON）:
      // 画面共有中のボードに DM・プライベートチャンネルの断片が表示される事故を防ぐ。
      const includePrivate = process.env.SLACK_INCLUDE_PRIVATE === "1";
      const visible = includePrivate
        ? matches
        : matches.filter(isPublicChannelMatch);
      return visible.flatMap(matchToSources);
    } catch (err) {
      console.error("Slack 検索に失敗:", err);
      return [];
    }
  },
};
