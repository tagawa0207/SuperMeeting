"use client";

import { useEffect, useState } from "react";
import type { Topic } from "@/lib/types";
import { speakerColor } from "@/lib/speakers";
import { CheckIcon } from "@/components/icons";

/** 左カラム。論点カード（議論中 / 結論あり / 未着手）の縦積み + 参加者カード。 */
export function TopicRail({
  topics,
  participants,
  currentSpeaker,
  onSelectSpeaker,
  onAddParticipant,
  autoMode,
}: {
  topics: Topic[];
  participants: string[];
  /** 手動モードでの現在の発言者。 */
  currentSpeaker: string | null;
  onSelectSpeaker: (name: string | null) => void;
  onAddParticipant: (name: string) => void;
  /** 拡張モード（Meet から話者を自動付与中）は発言者の選択を無効化する。 */
  autoMode: boolean;
}) {
  // 「いま議論中 · N分経過」用: 論点が discussing になった時刻を記録する。
  const [discussingSince, setDiscussingSince] = useState<
    Record<string, number>
  >({});
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const immediate = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDiscussingSince((prev) => {
        const missing = topics.filter(
          (tp) => tp.status === "discussing" && !(tp.title in prev),
        );
        if (missing.length === 0) return prev;
        const next = { ...prev };
        const at = Date.now();
        missing.forEach((tp) => {
          next[tp.title] = at;
        });
        return next;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [topics]);

  const discussingLabel = (title: string) => {
    const since = discussingSince[title];
    const min =
      since && now > since ? Math.floor((now - since) / 60_000) : 0;
    return min >= 1 ? `いま議論中 · ${min}分経過` : "いま議論中";
  };

  // 参加者の追加（「+ 追加」チップ → インライン入力）。
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const submitAdd = () => {
    const name = draft.trim();
    if (name) onAddParticipant(name);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <span className="px-0.5 text-[11px] font-bold tracking-[.12em] text-ink-4">
        論点の流れ
      </span>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {topics.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line-dash">
            <p className="text-center text-[12.5px] leading-[1.8] text-ink-4">
              議論が始まると
              <br />
              論点がここに積まれます
            </p>
          </div>
        ) : (
          topics.map((topic, i) => {
            if (topic.status === "discussing") {
              return (
                <div
                  key={topic.title}
                  className="flex flex-none animate-sm-in gap-[11px] rounded-xl border border-accent bg-white p-4 shadow-[0_0_0_3px_rgba(58,85,196,.08),0_1px_2px_rgba(25,22,18,.04)]"
                >
                  <span className="mt-px grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] leading-[1.45] font-bold">
                      {topic.title}
                    </p>
                    <p className="mt-1 text-[11.5px] font-semibold text-accent">
                      {discussingLabel(topic.title)}
                    </p>
                  </div>
                </div>
              );
            }
            if (topic.status === "resolved") {
              return (
                <div
                  key={topic.title}
                  className="flex flex-none animate-sm-in gap-[11px] rounded-xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(25,22,18,.04)]"
                >
                  <span className="mt-px grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-green-soft text-green">
                    <CheckIcon size={10} />
                  </span>
                  <div>
                    <p className="text-[13px] leading-[1.45] font-semibold text-ink-3">
                      {topic.title}
                    </p>
                    <p className="mt-1 text-[11.5px] text-ink-4">
                      {topic.points[0] ? `結論: ${topic.points[0]}` : "結論あり"}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={topic.title}
                className="flex flex-none animate-sm-in gap-[11px] rounded-xl border border-dashed border-line-dash px-4 py-3.5"
              >
                <span className="mt-px grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-line-soft text-[10px] font-bold text-ink-4">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] leading-[1.45] font-semibold text-ink-4">
                    {topic.title}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-5">未着手</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex-none rounded-xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(25,22,18,.04)]">
        <span className="text-[11px] font-bold tracking-[.12em] text-ink-4">
          参加者
        </span>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {participants.map((name) => {
            const active = !autoMode && name === currentSpeaker;
            return (
              <button
                key={name}
                onClick={() => !autoMode && onSelectSpeaker(active ? null : name)}
                disabled={autoMode}
                title={
                  autoMode
                    ? "Meet から自動付与中"
                    : "クリックで現在の発言者に設定"
                }
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs transition-colors ${
                  active
                    ? "bg-accent-soft font-semibold text-accent"
                    : "bg-softer text-ink-2"
                } ${autoMode ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: speakerColor(name) }}
                />
                {name}
              </button>
            );
          })}
          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={submitAdd}
              placeholder="名前"
              className="w-20 rounded-full border border-line-dash px-2.5 py-[3px] text-xs outline-none focus:border-accent"
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="rounded-full border border-dashed border-line-dash px-2.5 py-[3px] text-xs text-ink-4 transition-colors hover:bg-softer"
            >
              + 追加
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
