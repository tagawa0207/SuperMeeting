"use client";

import { useEffect, useRef, useState } from "react";
import { isBridgeMessage } from "@/lib/bridge";

export interface BridgeHandlers {
  onSegment: (text: string, speaker: string, at: number) => void;
  onInterim: (text: string, speaker: string) => void;
}

/**
 * Chrome 拡張（SuperMeeting Speaker Bridge）からの window.postMessage を購読する。
 * 拡張が Meet タブで検出した「話者付き発話」をこのアプリに流し込む。
 * 戻り値 connected は拡張が接続済みかどうか。
 */
export function useExtensionBridge(handlers: BridgeHandlers): {
  connected: boolean;
} {
  const [connected, setConnected] = useState(false);
  // ハンドラを ref 化し、リスナーを貼り直さずに最新版を呼ぶ。
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      // 同一オリジンからのメッセージのみ受け付ける。
      if (event.source !== window) return;
      const data = event.data;
      if (!isBridgeMessage(data)) return;

      switch (data.type) {
        case "SM_CONNECTED":
          setConnected(true);
          break;
        case "SM_SEGMENT":
          setConnected(true);
          handlersRef.current.onSegment(data.text, data.speaker, data.at);
          break;
        case "SM_INTERIM":
          setConnected(true);
          handlersRef.current.onInterim(data.text, data.speaker);
          break;
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  return { connected };
}
