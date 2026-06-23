// 話者名から安定した色を割り当てる（書き起こし・分析表示で話者を識別しやすくする）。

const PALETTE = [
  "#38bdf8", // sky
  "#f472b6", // pink
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#c084fc", // purple
  "#4ade80", // green
  "#f59e0b", // orange
];

export const UNKNOWN_SPEAKER = "不明";

export function speakerColor(name?: string | null): string {
  if (!name) return "#94a3b8"; // slate-400
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
