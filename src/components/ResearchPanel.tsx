"use client";

import { useState } from "react";
import type { ResearchResult, ResearchSource } from "@/lib/types";
import { Panel } from "./Panel";

function SourceItem({ source }: { source: ResearchSource }) {
  const isInternal = source.origin === "internal";
  const inner = (
    <>
      <span className="mr-1">{isInternal ? "🏢" : "🌐"}</span>
      <span className="font-medium">{source.title}</span>
      {source.snippet && (
        <span className="mt-0.5 block text-xs text-slate-400">
          {source.snippet}
        </span>
      )}
    </>
  );
  const linkable = source.url && source.url !== "#";
  return (
    <li className="rounded-lg bg-slate-900/50 p-2 text-sm">
      {linkable ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 hover:underline"
        >
          {inner}
        </a>
      ) : (
        <span className="text-slate-300">{inner}</span>
      )}
    </li>
  );
}

export function ResearchPanel({
  result,
  loading,
  error,
  activeQuery,
  onRun,
}: {
  result: ResearchResult | null;
  loading: boolean;
  error: string | null;
  activeQuery: string | null;
  onRun: (query: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const webSources = result?.sources.filter((s) => s.origin === "web") ?? [];
  const internalSources =
    result?.sources.filter((s) => s.origin === "internal") ?? [];

  return (
    <Panel title="調査・社内情報検索" icon="🔎">
      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onRun(draft);
            }
          }}
          placeholder="論点や疑問を入力して調べる（または論点の🔎ボタン）"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={() => draft.trim() && onRun(draft)}
          disabled={loading || !draft.trim()}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          調べる
        </button>
      </div>

      {activeQuery && (
        <div className="mb-2 text-xs text-slate-400">
          クエリ: <span className="text-slate-200">{activeQuery}</span>
          {result && (
            <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5">
              {result.engine === "claude" ? "🟢 Web検索" : "⚪ モック"}
            </span>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">調査中…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !result && !error && (
        <p className="text-sm text-slate-500">
          論点や未解決の問いの「🔎」を押すか、上の入力欄から調査できます。
        </p>
      )}

      {result && !loading && (
        <div className="space-y-3">
          {result.summary && (
            <p className="whitespace-pre-wrap rounded-lg bg-slate-900/50 p-3 text-sm leading-relaxed text-slate-200">
              {result.summary}
            </p>
          )}

          {webSources.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-400">
                🌐 Web の根拠
              </h3>
              <ul className="space-y-1.5">
                {webSources.map((s, i) => (
                  <SourceItem key={`w-${i}`} source={s} />
                ))}
              </ul>
            </div>
          )}

          {internalSources.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-400">
                🏢 社内情報
              </h3>
              <ul className="space-y-1.5">
                {internalSources.map((s, i) => (
                  <SourceItem key={`i-${i}`} source={s} />
                ))}
              </ul>
              {result.internalNote && (
                <p className="mt-1 text-xs text-amber-400/80">
                  {result.internalNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
