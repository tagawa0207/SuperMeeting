"use client";

import { useState } from "react";
import type { ResearchCard, ResearchSource } from "@/lib/types";
import { Panel } from "./Panel";

/** 上からこの枚数までは展開表示、それより古いカードは折りたたむ。 */
const EXPANDED_COUNT = 5;

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

function StatusBadge({ status }: { status: ResearchCard["status"] }) {
  if (status === "queued") {
    return <span className="text-xs text-slate-500">待機中…</span>;
  }
  if (status === "searching") {
    return (
      <span className="flex items-center gap-1 text-xs text-sky-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
        検索中…
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs text-red-400">エラー</span>;
  }
  return null;
}

function CardHeader({ card }: { card: ResearchCard }) {
  const isInternal = card.target === "internal";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded px-1.5 py-0.5 text-xs ${
          isInternal
            ? "bg-amber-500/20 text-amber-300"
            : "bg-sky-500/20 text-sky-300"
        }`}
      >
        {isInternal ? "🏢 社内" : "🌐 Web"}
      </span>
      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
        {card.trigger === "auto" ? "自動" : "手動"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
        {card.query}
      </span>
      <StatusBadge status={card.status} />
    </div>
  );
}

function Card({
  card,
  collapsible,
}: {
  card: ResearchCard;
  /** 古いカードは折りたたみ表示（クリックで展開）。 */
  collapsible: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const open = !collapsible || expanded;

  return (
    <li className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2.5">
      {collapsible ? (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="block w-full text-left"
          title={open ? "折りたたむ" : "展開する"}
        >
          <CardHeader card={card} />
        </button>
      ) : (
        <CardHeader card={card} />
      )}

      {open && (
        <div className="mt-2 space-y-2">
          {card.triggeredBy && (
            <p className="text-xs text-slate-500">
              発言: 「{card.triggeredBy.quote}」
            </p>
          )}
          {card.summary && (
            <p
              className={`whitespace-pre-wrap rounded-lg bg-slate-900/50 p-2.5 text-sm leading-relaxed ${
                card.status === "error" ? "text-red-400" : "text-slate-200"
              }`}
            >
              {card.summary}
            </p>
          )}
          {card.sources.length > 0 && (
            <ul className="space-y-1.5">
              {card.sources.map((s, i) => (
                <SourceItem key={i} source={s} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export function AutoResearchPanel({
  cards,
  onRun,
  autoEnabled,
  onToggleAuto,
}: {
  cards: ResearchCard[];
  onRun: (query: string) => void;
  /** 自動検索の ON/OFF（既定 OFF。会議内容が外部の Web 検索に送られるため明示的に ON にする）。 */
  autoEnabled: boolean;
  onToggleAuto: (enabled: boolean) => void;
}) {
  const [draft, setDraft] = useState("");

  const run = () => {
    if (!draft.trim()) return;
    onRun(draft);
    setDraft("");
  };

  return (
    <Panel title="調査・社内情報検索" icon="🔎" count={cards.length}>
      <label className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={autoEnabled}
          onChange={(e) => onToggleAuto(e.target.checked)}
          className="h-4 w-4 accent-sky-500"
        />
        発話に反応して自動検索
        <span className="text-xs text-slate-500">
          （ON にすると発話内容の一部が外部の Web 検索に送信されます）
        </span>
      </label>
      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder="論点や疑問を入力して調べる（または論点の🔎ボタン）"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={run}
          disabled={!draft.trim()}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          調べる
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">
          論点や未解決の問いの「🔎」を押すか、上の入力欄から調査できます。
          結果は Web / 社内それぞれ独立したカードとして新着順に積まれます。
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card, i) => (
            <Card key={card.id} card={card} collapsible={i >= EXPANDED_COUNT} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
