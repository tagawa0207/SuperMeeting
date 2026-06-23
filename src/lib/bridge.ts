// Chrome 拡張 ↔ Web アプリ間の window.postMessage プロトコル定義。
// 拡張（extension/）側もこの形に合わせてメッセージを送る。

export const BRIDGE_SOURCE = "supermeeting-extension";

/** 拡張が接続したことの通知。 */
export interface BridgeConnected {
  source: typeof BRIDGE_SOURCE;
  type: "SM_CONNECTED";
}

/** 確定した話者付き発話。 */
export interface BridgeSegment {
  source: typeof BRIDGE_SOURCE;
  type: "SM_SEGMENT";
  text: string;
  speaker: string;
  at: number;
}

/** 認識途中（暫定）の発話。 */
export interface BridgeInterim {
  source: typeof BRIDGE_SOURCE;
  type: "SM_INTERIM";
  text: string;
  speaker: string;
}

export type BridgeMessage = BridgeConnected | BridgeSegment | BridgeInterim;

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === BRIDGE_SOURCE
  );
}
