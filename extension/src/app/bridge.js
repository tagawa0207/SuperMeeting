// アプリ側ブリッジ（SuperMeeting アプリのタブで動く content script）。
// バックグラウンドから届く SM_* メッセージを window.postMessage でページに渡す。
// ページ側は src/hooks/useExtensionBridge.ts でこれを購読する。

const BRIDGE_SOURCE = "supermeeting-extension";

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== "string") return;
  if (!message.type.startsWith("SM_")) return;
  window.postMessage(
    Object.assign({ source: BRIDGE_SOURCE }, message),
    window.location.origin,
  );
});

// 拡張が存在していることをページに知らせる（接続インジケータ用）。
window.postMessage(
  { source: BRIDGE_SOURCE, type: "SM_CONNECTED" },
  window.location.origin,
);
