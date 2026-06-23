"use client";

import { useState } from "react";
import { speakerColor } from "@/lib/speakers";

/**
 * 話者の管理バー。
 * - 手動モード: 参加者を登録し、現在の発言者をクリックで切り替える。
 * - 拡張モード: 発言者は Meet から自動付与されるため、選択は補助的（無効表示）。
 */
export function SpeakerBar({
  speakers,
  currentSpeaker,
  onSelect,
  onAdd,
  autoMode,
}: {
  speakers: string[];
  currentSpeaker: string | null;
  onSelect: (name: string | null) => void;
  onAdd: (name: string) => void;
  autoMode: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const name = draft.trim();
    if (name) {
      onAdd(name);
      if (!autoMode) onSelect(name);
      setDraft("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
      <span className="text-sm text-slate-300">👥 話者</span>

      {autoMode ? (
        <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
          Meet から自動付与中
        </span>
      ) : (
        <span className="text-xs text-slate-500">
          発言者を選んでから話す/入力すると話者が付きます
        </span>
      )}

      {speakers.map((name) => {
        const active = !autoMode && name === currentSpeaker;
        return (
          <button
            key={name}
            onClick={() => !autoMode && onSelect(active ? null : name)}
            disabled={autoMode}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition ${
              active
                ? "ring-2 ring-offset-1 ring-offset-slate-800"
                : "opacity-80 hover:opacity-100"
            } ${autoMode ? "cursor-default" : "cursor-pointer"}`}
            style={{
              backgroundColor: `${speakerColor(name)}22`,
              color: speakerColor(name),
              boxShadow: active ? `0 0 0 2px ${speakerColor(name)}` : undefined,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: speakerColor(name) }}
            />
            {name}
          </button>
        );
      })}

      {!autoMode && (
        <div className="flex items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="参加者を追加"
            className="w-32 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
          <button
            onClick={add}
            className="rounded-lg bg-slate-700 px-2 py-1 text-sm text-slate-100 transition hover:bg-slate-600"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
