// 話者名から安定した色を割り当てる（初出順に固定パレットを循環）。
// ライト面（カード・チップ）では light、ダーク面（テロップ・ドロワー）では dark を使う。

const PALETTE = [
  { light: "#3A55C4", dark: "#7E96E8" },
  { light: "#1E8A5C", dark: "#6FC9A0" },
  { light: "#C08A2D", dark: "#E8BE71" },
  { light: "#8E5BB8", dark: "#B48BD6" },
];

export const UNKNOWN_SPEAKER = "不明";

export type SpeakerTone = "light" | "dark";

const assigned = new Map<string, number>();

export function speakerColor(
  name?: string | null,
  tone: SpeakerTone = "light",
): string {
  if (!name) return tone === "light" ? "#A6A199" : "#8A857C";
  let idx = assigned.get(name);
  if (idx === undefined) {
    idx = assigned.size % PALETTE.length;
    assigned.set(name, idx);
  }
  return PALETTE[idx][tone];
}
