"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/types";

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TranscriptPanel({
  segments,
  interim,
  onAddManual,
}: {
  segments: TranscriptSegment[];
  interim: string;
  onAddManual: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新しい発話が来たら自動で最下部にスクロール。
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [segments, interim]);

  const submit = () => {
    if (draft.trim()) {
      onAddManual(draft);
      setDraft("");
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <header className="mb-3 flex items-center gap-2">
        <span aria-hidden className="text-lg">
          🎙️
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">
          書き起こし
        </h2>
        <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
          {segments.length}
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto pr-1 text-sm"
      >
        {segments.length === 0 && !interim && (
          <p className="text-slate-500">
            ここに発話が流れます。マイクで話すか、下に入力してください。
          </p>
        )}
        {segments.map((seg) => (
          <div key={seg.id} className="rounded-lg bg-slate-900/50 p-2">
            <span className="mr-2 text-xs text-slate-500">
              {formatTime(seg.at)}
            </span>
            <span className="text-slate-200">{seg.text}</span>
          </div>
        ))}
        {interim && (
          <div className="rounded-lg border border-dashed border-slate-600 p-2 text-slate-400">
            {interim}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="発言を手入力（デモ・補足用）"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={submit}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-600"
        >
          追加
        </button>
      </div>
    </div>
  );
}
