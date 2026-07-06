"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/types";
import { speakerColor } from "@/lib/speakers";
import { ChevronDownIcon, SearchIcon } from "@/components/icons";

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatElapsed(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** 書き起こしの全文ドロワー。テロップの「全文を見る」で画面下 56% に展開する。 */
export function TranscriptDrawer({
  open,
  onClose,
  segments,
  interim,
  interimSpeaker,
  onAddManual,
}: {
  open: boolean;
  onClose: () => void;
  segments: TranscriptSegment[];
  interim: string;
  interimSpeaker: string | null;
  onAddManual: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 経過時間（最初の発話からの時間）の表示を 1 秒刻みで更新する。
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!open) return;
    const update = () => setNow(Date.now());
    const immediate = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [open]);

  // 新しい発話が来たら自動で最下部にスクロール。
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [open, segments, interim]);

  if (!open) return null;

  const q = query.trim();
  const filtered = q
    ? segments.filter(
        (seg) => seg.text.includes(q) || seg.speaker?.includes(q),
      )
    : segments;

  const submit = () => {
    if (draft.trim()) {
      onAddManual(draft);
      setDraft("");
    }
  };

  return (
    <>
      <div
        className="absolute inset-0 z-40 bg-[rgba(30,28,25,.25)]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 z-50 flex h-[56%] animate-sm-drawer flex-col rounded-t-[20px] bg-dark text-white shadow-[0_-12px_40px_rgba(25,22,18,.35)]">
        <div className="flex flex-none items-center gap-3.5 border-b border-white/[.09] px-7 pt-[18px] pb-3">
          <div className="flex items-center gap-[7px]">
            <span className="h-2 w-2 animate-sm-pulse rounded-full bg-[#E4604A]" />
            <span className="text-[11px] font-bold tracking-[.08em] text-dark-ink-3">
              LIVE
            </span>
          </div>
          <span className="text-sm font-bold text-dark-ink">書き起こし</span>
          <span className="text-[11.5px] text-dark-ink-4 tabular-nums">
            {segments.length} 発話
            {segments.length > 0 &&
              now > 0 &&
              ` · ${formatElapsed(now - segments[0].at)}`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[.07] px-3 py-[7px] text-dark-ink-4">
              <SearchIcon size={12} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="発話を検索…"
                className="w-40 bg-transparent text-xs text-dark-ink outline-none placeholder:text-dark-ink-4"
              />
            </div>
            <button
              onClick={onClose}
              className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-white/[.07] text-ink-5 transition-colors hover:bg-white/[.15]"
            >
              <ChevronDownIcon size={12} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-4"
        >
          {filtered.length === 0 && !interim && (
            <p className="text-[13px] text-dark-ink-4">
              {q ? "一致する発話はありません。" : "まだ発話はありません。"}
            </p>
          )}
          {filtered.map((seg) => (
            <div key={seg.id} className="flex gap-3.5">
              <span className="w-16 flex-none pt-0.5 text-right text-[11.5px] text-ink-3 tabular-nums">
                {formatTime(seg.at)}
              </span>
              <div>
                {seg.speaker && (
                  <span
                    className="text-xs font-bold"
                    style={{ color: speakerColor(seg.speaker, "dark") }}
                  >
                    {seg.speaker}
                  </span>
                )}
                <p className="mt-[3px] text-sm leading-[1.7] text-dark-ink-2">
                  {seg.text}
                </p>
              </div>
            </div>
          ))}
          {interim && !q && (
            <div className="flex gap-3.5 opacity-70">
              <span className="w-16 flex-none pt-0.5 text-right text-[11.5px] text-ink-3">
                …
              </span>
              <div className="border-l-2 border-dashed border-[#57534B] pl-3">
                {interimSpeaker && (
                  <span
                    className="text-xs font-bold"
                    style={{ color: speakerColor(interimSpeaker, "dark") }}
                  >
                    {interimSpeaker}
                  </span>
                )}
                <p className="mt-[3px] text-sm leading-[1.7] text-dark-ink-3">
                  {interim}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-none gap-2.5 border-t border-white/[.09] px-7 pt-3.5 pb-[18px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="発言を手入力（デモ・補足用）…"
            className="flex-1 rounded-[9px] bg-white/[.07] px-3.5 py-[9px] text-[13px] text-dark-ink outline-none placeholder:text-dark-ink-4 focus:bg-white/[.1]"
          />
          <button
            onClick={submit}
            className="rounded-[9px] bg-white/[.12] px-4 py-[9px] text-[13px] text-dark-ink transition-colors hover:bg-white/[.2]"
          >
            追加
          </button>
        </div>
      </div>
    </>
  );
}
