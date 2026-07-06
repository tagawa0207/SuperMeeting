"use client";

import type { TranscriptSegment } from "@/lib/types";
import { speakerColor } from "@/lib/speakers";

/** 画面最下部のライブテロップ。最新の確定発話を 1 行で流す（常時ダーク面）。 */
export function LiveTicker({
  segment,
  onOpenDrawer,
}: {
  segment: TranscriptSegment | null;
  onOpenDrawer: () => void;
}) {
  return (
    <div className="flex h-[62px] flex-none items-center gap-4 bg-dark px-6 text-white">
      {segment ? (
        <>
          <div className="flex flex-none items-center gap-[7px]">
            <span className="h-2 w-2 animate-sm-pulse rounded-full bg-[#E4604A]" />
            <span className="text-[11px] font-bold tracking-[.08em] text-dark-ink-3">
              LIVE
            </span>
          </div>
          {segment.speaker && (
            <span
              className="flex flex-none items-center gap-1.5 rounded-full px-[11px] py-[3px] text-xs font-semibold"
              style={{
                backgroundColor: `${speakerColor(segment.speaker, "light")}4D`,
                color: speakerColor(segment.speaker, "dark"),
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: speakerColor(segment.speaker, "dark"),
                }}
              />
              {segment.speaker}
            </span>
          )}
          <p className="flex-1 truncate text-[15.5px] leading-normal text-dark-ink">
            {segment.text}
          </p>
          <button
            onClick={onOpenDrawer}
            className="flex-none p-1 text-[11.5px] text-dark-ink-3 transition-colors hover:text-dark-ink"
          >
            全文を見る ↗
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-none items-center gap-[7px]">
            <span className="h-2 w-2 rounded-full bg-[#57534B]" />
            <span className="text-[11px] font-bold tracking-[.08em] text-ink-3">
              STANDBY
            </span>
          </div>
          <p className="flex-1 text-sm text-dark-ink-4">
            マイク待機中 — 録音を開始すると最新の発話がここに流れます
          </p>
        </>
      )}
    </div>
  );
}
