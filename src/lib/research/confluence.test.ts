// confluence.ts のユニットテスト（CQL 組み立てと個人スペース除外が主対象）。
// 実行: node --test src/lib/research/confluence.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCql,
  confluenceInternalSource,
  escapeCql,
  formatConfluenceDate,
  formatConfluenceSnippet,
  resultToSource,
  stripSlackModifiers,
  type ConfluenceSearchResult,
} from "./confluence.ts";

test("stripSlackModifiers: in:/after: 等の Slack 修飾子を除去", () => {
  assert.equal(
    stripSlackModifiers("SuperMeeting 話者分離 in:dev after:2026-01-01"),
    "SuperMeeting 話者分離",
  );
  assert.equal(stripSlackModifiers("料金プラン 比較"), "料金プラン 比較");
  assert.equal(stripSlackModifiers("in:general"), "");
});

test("escapeCql: \" と \\ をエスケープ", () => {
  assert.equal(escapeCql('say "hi" \\ ok'), 'say \\"hi\\" \\\\ ok');
});

test("buildCql: siteSearch + type + 個人スペース除外（既定）", () => {
  assert.equal(
    buildCql("話者分離 設計", false),
    'siteSearch ~ "話者分離 設計" AND type in ("page", "blogpost") AND space.type = "global"',
  );
  assert.ok(!buildCql("x", true).includes("space.type"));
});

test("formatConfluenceSnippet: ハイライトマーカー・エンティティの除去と 150 字カット", () => {
  assert.equal(
    formatConfluenceSnippet(
      "@@@hl@@@話者分離@@@endhl@@@ の設計は A &amp; B を比較して &quot;拡張&quot; 案に決定",
    ),
    '話者分離 の設計は A & B を比較して "拡張" 案に決定',
  );
  const long = formatConfluenceSnippet("あ".repeat(200));
  assert.equal(long.length, 151);
  assert.ok(long.endsWith("…"));
});

test("formatConfluenceDate: ISO 8601 を YYYY-MM-DD に整形", () => {
  assert.match(
    formatConfluenceDate("2026-07-01T12:00:00.000Z"),
    /^\d{4}-\d{2}-\d{2}$/,
  );
  assert.equal(formatConfluenceDate(undefined), "日付不明");
  assert.equal(formatConfluenceDate("not-a-date"), "日付不明");
});

test("resultToSource: スペース名 + タイトル + 絶対 URL", () => {
  const result: ConfluenceSearchResult = {
    title: "@@@hl@@@話者分離@@@endhl@@@ 設計メモ",
    excerpt: "拡張の @@@hl@@@セレクタ@@@endhl@@@ を更新",
    url: "/spaces/ENG/pages/123/x",
    resultGlobalContainer: { title: "Engineering" },
    lastModified: "2026-07-01T12:00:00.000Z",
  };
  const source = resultToSource(result, "https://example.atlassian.net/wiki/");
  assert.ok(source.title.startsWith("[Engineering] 話者分離 設計メモ（"));
  assert.equal(source.url, "https://example.atlassian.net/wiki/spaces/ENG/pages/123/x");
  assert.equal(source.snippet, "拡張の セレクタ を更新");
  assert.equal(source.origin, "internal");
});

const CONFLUENCE_ENV = {
  CONFLUENCE_BASE_URL: "https://example.atlassian.net/wiki",
  CONFLUENCE_EMAIL: "taro@example.com",
  CONFLUENCE_API_TOKEN: "token-test",
} as const;

async function searchWithMockedResponse(
  body: unknown,
  status = 200,
): Promise<{ sources: Awaited<ReturnType<typeof confluenceInternalSource.search>>; requestedUrl: string }> {
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(
    Object.keys(CONFLUENCE_ENV).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, CONFLUENCE_ENV);
  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  try {
    const sources = await confluenceInternalSource.search("テスト in:dev");
    return { sources, requestedUrl };
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("search: CQL に個人スペース除外が入り、Slack 修飾子が消える", async () => {
  const { sources, requestedUrl } = await searchWithMockedResponse({
    results: [{ title: "ページ", url: "/spaces/ENG/pages/1/p" }],
  });
  const cql = new URL(requestedUrl).searchParams.get("cql") ?? "";
  assert.ok(cql.includes('space.type = "global"'));
  assert.ok(cql.includes('siteSearch ~ "テスト"'));
  assert.ok(!cql.includes("in:dev"));
  assert.equal(sources.length, 1);
});

test("search: API エラー時は例外を投げず空配列", async () => {
  const { sources } = await searchWithMockedResponse(
    { message: "unauthorized" },
    401,
  );
  assert.deepEqual(sources, []);
});
