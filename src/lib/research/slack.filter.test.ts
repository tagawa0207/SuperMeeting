// slack.ts のユニットテスト（public チャンネル限定フィルタが主対象）。
// 実行: node --test src/lib/research/slack.filter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractMessageLinks,
  formatSlackDate,
  formatSlackSnippet,
  isPublicChannelMatch,
  matchToSources,
  slackInternalSource,
  type SlackMatch,
} from "./slack.ts";

const publicMatch: SlackMatch = {
  channel: { name: "general", is_private: false, is_im: false, is_mpim: false },
  username: "taro",
  // 2025-07-04T12:00:00Z（正午 UTC なので大半のタイムゾーンで同日になる）
  ts: "1751630400.000100",
  text: "リリース手順は <https://example.atlassian.net/wiki/x|Confluence> 参照",
  permalink: "https://example.slack.com/archives/C01/p1751600000000100",
};

test("isPublicChannelMatch: public チャンネルのみ通す", () => {
  assert.equal(isPublicChannelMatch(publicMatch), true);
  assert.equal(
    isPublicChannelMatch({ channel: { name: "secret", is_private: true } }),
    false,
  );
  assert.equal(isPublicChannelMatch({ channel: { is_im: true } }), false);
  assert.equal(isPublicChannelMatch({ channel: { is_mpim: true } }), false);
  assert.equal(isPublicChannelMatch({}), false);
});

test("formatSlackDate: ts を YYYY-MM-DD に整形", () => {
  assert.match(formatSlackDate("1751630400.000100"), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(formatSlackDate(undefined), "日付不明");
});

test("formatSlackSnippet: Slack 記法の可読化と 150 字カット", () => {
  assert.equal(
    formatSlackSnippet(
      "<@U123|taro> が <#C456|dev> に <https://a.example|資料> を投稿 &amp; 共有",
    ),
    "@taro が #dev に 資料 を投稿 & 共有",
  );
  const long = formatSlackSnippet("あ".repeat(200));
  assert.equal(long.length, 151);
  assert.ok(long.endsWith("…"));
});

test("extractMessageLinks: <URL> / <URL|ラベル> を抽出", () => {
  assert.deepEqual(
    extractMessageLinks("<https://a.example> と <https://b.example|B社資料>"),
    [
      { url: "https://a.example", label: undefined },
      { url: "https://b.example", label: "B社資料" },
    ],
  );
});

test("matchToSources: 本体 + メッセージ内リンク（最大 2 件）", () => {
  const sources = matchToSources({
    ...publicMatch,
    text: "<https://a.example|A> <https://b.example> <https://c.example>",
  });
  assert.equal(sources.length, 3);
  assert.equal(sources[0].title, "#general — taro（2025-07-04）");
  assert.equal(sources[0].url, publicMatch.permalink);
  assert.equal(sources[0].origin, "internal");
  assert.equal(sources[1].title, "A");
  assert.equal(sources[1].url, "https://a.example");
  assert.equal(sources[2].title, "https://b.example");
});

async function searchWithMockedResponse(body: unknown) {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.SLACK_USER_TOKEN;
  process.env.SLACK_USER_TOKEN = "xoxp-test";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body))) as typeof fetch;
  try {
    return await slackInternalSource.search("テスト");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SLACK_USER_TOKEN;
    else process.env.SLACK_USER_TOKEN = originalToken;
  }
}

test("search: DM・プライベートチャンネル由来のマッチを除外する", async () => {
  const sources = await searchWithMockedResponse({
    ok: true,
    messages: {
      matches: [
        publicMatch,
        {
          ...publicMatch,
          channel: { name: "secret-proj", is_private: true },
          text: "プライベートの内容",
        },
        { ...publicMatch, channel: { name: "dm", is_im: true }, text: "DM" },
        { ...publicMatch, channel: { name: "gdm", is_mpim: true } },
      ],
    },
  });
  assert.ok(sources.length > 0);
  assert.ok(sources.every((s) => !s.title.includes("secret-proj")));
  assert.ok(
    sources.every((s) => !s.snippet?.includes("プライベートの内容")),
  );
  assert.ok(sources.every((s) => s.origin === "internal"));
});

test("search: API エラー時は例外を投げず空配列", async () => {
  const sources = await searchWithMockedResponse({
    ok: false,
    error: "invalid_auth",
  });
  assert.deepEqual(sources, []);
});
