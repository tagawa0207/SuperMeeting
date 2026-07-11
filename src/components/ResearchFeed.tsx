"use client";

import { useEffect, useState } from "react";
import type { ResearchCard } from "@/lib/types";
import {
  ChevronDownIcon,
  FileTextIcon,
  GlobeIcon,
} from "@/components/icons";

/** これより古い完了カードは 1 行に折りたたむ（クリックで展開）。 */
const EXPANDED_MAX = 4;

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OriginBadge({ target }: { target: ResearchCard["target"] }) {
  const internal = target === "internal";
  return (
    <span
      className={`rounded-[5px] px-[7px] py-0.5 text-[10.5px] font-bold tracking-[.06em] ${
        internal ? "bg-amber-soft text-amber" : "bg-accent-soft text-accent"
      }`}
    >
      {internal ? "社内" : "WEB"}
    </span>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-block h-4 w-7 rounded-full transition-colors duration-200 ${
        on ? "bg-accent" : "bg-line-dash"
      }`}
    >
      <span
        className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] duration-200"
        style={{ left: on ? 14 : 2 }}
      />
    </span>
  );
}

/** 右カラム。発話に反応した Web / 社内(Slack・Confluence) 調査カードのフィード（新着が上）。 */
export function ResearchFeed({
  cards,
  onRun,
  autoEnabled,
  onToggleAuto,
}: {
  cards: ResearchCard[];
  onRun: (query: string) => void;
  autoEnabled: boolean;
  onToggleAuto: (enabled: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 「検索中 · N秒」の経過表示。検索中カードがあるときだけ 1 秒刻みで更新する。
  const [now, setNow] = useState(0);
  const hasSearching = cards.some(
    (c) => c.status === "searching" || c.status === "queued",
  );
  useEffect(() => {
    if (!hasSearching) return;
    const update = () => setNow(Date.now());
    const immediate = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [hasSearching]);

  const submit = () => {
    const q = draft.trim();
    if (!q) return;
    onRun(q);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <div className="flex flex-none items-center px-0.5">
        <span className="text-[11px] font-bold tracking-[.12em] text-ink-4">
          ライブリサーチ
        </span>
        <button
          onClick={() => onToggleAuto(!autoEnabled)}
          className="ml-auto flex items-center gap-1.5"
        >
          <span className="text-[11px] text-ink-2">自動</span>
          <Switch on={autoEnabled} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {cards.length === 0 ? (
          <div className="grid min-h-[180px] flex-1 place-items-center rounded-xl border border-dashed border-line-dash">
            <div className="px-7 text-center">
              <p className="text-[12.5px] leading-[1.8] text-ink-4">
                発話に反応して Web・社内の
                <br />
                関連情報がカードで届きます
              </p>
              <button
                onClick={() => onToggleAuto(!autoEnabled)}
                className="mt-3 inline-flex items-center gap-[7px] rounded-full border border-line bg-white px-3 py-[5px] transition-colors hover:bg-softer"
              >
                <span className="text-[11.5px] text-ink-2">自動検索</span>
                <Switch on={autoEnabled} />
                <span className="text-[10.5px] text-ink-4">
                  {autoEnabled ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          cards.map((card, i) => {
            const searching =
              card.status === "searching" || card.status === "queued";
            const isError = card.status === "error";
            if (
              card.status === "done" &&
              i >= EXPANDED_MAX &&
              !expanded[card.id]
            ) {
              return (
                <button
                  key={card.id}
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [card.id]: true }))
                  }
                  className="flex flex-none items-center gap-2 rounded-xl border border-line bg-soft px-4 py-[11px] text-left"
                >
                  <OriginBadge target={card.target} />
                  <span className="flex-1 truncate text-[12.5px] text-ink-3">
                    {card.query}
                  </span>
                  <span className="flex-none text-ink-5">
                    <ChevronDownIcon size={11} />
                  </span>
                </button>
              );
            }
            return (
              <div
                key={card.id}
                className={`flex-none animate-sm-in-slow rounded-xl border px-4 py-3.5 ${
                  isError
                    ? "border-err-line bg-err-soft"
                    : searching
                      ? "border-accent-line bg-white shadow-[0_0_0_3px_rgba(58,85,196,.06)]"
                      : "border-line bg-white shadow-[0_1px_2px_rgba(25,22,18,.04)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <OriginBadge target={card.target} />
                  <span className="rounded-[5px] border border-line px-1.5 py-px text-[10.5px] text-ink-4">
                    {card.trigger === "auto" ? "自動" : "手動"}
                  </span>
                  {searching ? (
                    <span className="ml-auto flex items-center gap-[5px]">
                      <span className="h-1.5 w-1.5 animate-sm-pulse-fast rounded-full bg-accent" />
                      <span className="text-[11px] font-semibold text-accent">
                        検索中
                        {now > card.at &&
                          ` · ${Math.floor((now - card.at) / 1000)}秒`}
                      </span>
                    </span>
                  ) : isError ? (
                    <span className="ml-auto text-[11px] font-semibold text-err">
                      エラー
                    </span>
                  ) : (
                    <span className="ml-auto text-[11px] text-ink-5 tabular-nums">
                      {formatTime(card.at)}
                    </span>
                  )}
                </div>

                <p className="mt-[9px] text-[13.5px] leading-[1.55] font-bold">
                  {card.query}
                </p>
                {card.trigger === "auto" && card.triggeredBy && (
                  <p className="mt-1.5 text-[11px] text-ink-5">
                    発言:「{card.triggeredBy.quote}」
                  </p>
                )}

                {isError ? (
                  <p className="mt-1.5 text-xs leading-[1.6] text-[#8A5555]">
                    {card.summary}{" "}
                    <button
                      onClick={() => onRun(card.query)}
                      className="font-bold underline underline-offset-2"
                    >
                      再試行
                    </button>
                  </p>
                ) : (
                  card.summary && (
                    <p className="mt-2 text-[12.5px] leading-[1.7] text-ink-2">
                      {card.summary}
                    </p>
                  )
                )}

                {card.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-2 border-t border-line-soft pt-2.5">
                    {card.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        title={s.title}
                        className="flex gap-2"
                      >
                        <span className="mt-0.5 flex-none text-ink-4">
                          {s.origin === "internal" ? (
                            <FileTextIcon size={12} />
                          ) : (
                            <GlobeIcon size={12} />
                          )}
                        </span>
                        <span className="truncate text-xs font-semibold text-accent">
                          {s.title}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-none gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="論点や疑問を調べる…"
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[12.5px] outline-none placeholder:text-ink-5 focus:border-accent"
        />
        <button
          onClick={submit}
          className="flex-none rounded-[10px] border border-accent-line bg-accent-soft px-3.5 py-[9px] text-[12.5px] font-semibold text-accent transition-colors hover:bg-accent-line"
        >
          調べる
        </button>
      </div>
    </div>
  );
}
