"use client";

import { MicIcon } from "@/components/icons";

/** 中央カラムの空状態（分析結果がまだないとき）。 */
export function EmptyStage({
  supported,
  extConnected,
  onStart,
  onLoadSample,
}: {
  supported: boolean;
  extConnected: boolean;
  onStart: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div className="grid min-h-0 animate-sm-in place-items-center rounded-[14px] border border-line bg-white shadow-[0_1px_3px_rgba(25,22,18,.05)]">
      <div className="max-w-[420px] p-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-accent-soft text-accent">
          <MicIcon size={22} strokeWidth={1.3} />
        </div>
        <h2 className="mt-[18px] text-[21px] font-extrabold tracking-[-.01em]">
          会議を始めましょう
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.9] text-ink-3">
          録音を開始すると発話がリアルタイムに書き起こされ、AI
          が論点・決定・TODO
          に整理してこの画面に表示します。この画面をそのまま Meet
          で共有してください。
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button
            onClick={onStart}
            disabled={!supported || extConnected}
            title={
              extConnected
                ? "拡張から受信中のため、ローカル録音は不要です"
                : supported
                  ? ""
                  : "このブラウザは音声認識に非対応（Chrome 推奨）"
            }
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-[9px] text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MicIcon size={12} />
            録音開始
          </button>
          <button
            onClick={onLoadSample}
            className="rounded-lg border border-line bg-white px-4 py-[9px] text-[13.5px] text-ink-2 transition-colors hover:bg-softer"
          >
            サンプルで試す
          </button>
        </div>
      </div>
    </div>
  );
}
