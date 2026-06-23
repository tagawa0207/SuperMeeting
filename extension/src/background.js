// バックグラウンド（service worker）。
// Meet タブの content script から受け取った話者付き発話を、
// SuperMeeting アプリのタブへ中継する。

// アプリを開いているタブの URL パターン。デプロイ先に合わせて変更可。
const APP_URL_PATTERNS = [
  "http://localhost:3000/*",
  "http://127.0.0.1:3000/*",
];

chrome.runtime.onMessage.addListener((message, sender) => {
  // Meet content script からの SM_* メッセージのみ中継する。
  if (!message || typeof message.type !== "string") return;
  if (!message.type.startsWith("SM_")) return;
  // app/bridge.js（アプリ側）からのメッセージは中継対象外。
  if (sender.tab && sender.tab.url && sender.tab.url.includes("meet.google.com") === false) {
    // Meet 以外（=アプリ側）から来たものはループさせない。
    return;
  }

  chrome.tabs.query({ url: APP_URL_PATTERNS }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          /* アプリ未起動など。無視。 */
        });
      }
    }
  });
});
