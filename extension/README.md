# SuperMeeting Speaker Bridge（Chrome 拡張）

Google Meet の **現在の発言者を検出**し、ブラウザ標準の音声認識で書き起こした発話に
**話者ラベルを付けて** SuperMeeting アプリ（別タブ）へ送る Chrome 拡張です。

別タブの Web アプリからは Meet タブの中（誰が光っているか）を覗けないため、
話者分離は「Meet タブの中で動く拡張」が担当する、という役割分担です。

## 仕組み

```
Meet タブ                          SuperMeeting アプリのタブ
┌─────────────────────────┐        ┌───────────────────────────┐
│ src/meet/content.js     │        │ src/app/bridge.js         │
│  ・発言者を検出          │  SM_*  │  （content script）        │
│  ・音声認識で書き起こし   │ ─────▶ │  window.postMessage で     │
│  ・オーバーレイ表示       │ via bg │  ページへ受け渡し           │
└─────────────────────────┘        └─────────────┬─────────────┘
            │ chrome.runtime                       │ window.message
            ▼                                      ▼
   src/background.js（中継）              useExtensionBridge.ts（購読）
```

## インストール

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」→ この `extension/` フォルダを選択
4. SuperMeeting アプリ（`npm run dev` で http://localhost:3000）を別タブで開く
5. Google Meet の会議に参加する

> アプリの URL が localhost:3000 以外（デプロイ先など）の場合は、
> `manifest.json` の `host_permissions` と `content_scripts[].matches`、および
> `src/background.js` の `APP_URL_PATTERNS` を、その URL に合わせて書き換えてください。

## 使い方

1. Meet 画面の右下に小さなオーバーレイ（🧠 SuperMeeting）が出ます
2. 「● 書き起こし開始」を押すと音声認識が始まります
3. 検出した発言者が「現在: 〇〇（自動）」と表示され、発話に話者が付いて
   SuperMeeting アプリ側へ流れます
4. アプリ側のヘッダーが「🔌 Meet 拡張 接続中」になり、書き起こしに話者ラベルが付きます

## 自動検出が外れるとき

Meet の DOM は難読化されており、バージョンで変わります。発言者がうまく取れない場合:

- **手動固定（確実な回避策）** … オーバーレイの参加者ボタンをクリックすると、その人に
  話者を固定できます。「自動」を押すと自動検出に戻ります。
- **セレクタ調整** … `src/meet/content.js` 冒頭の `SELECTORS` を現行 Meet の DOM に合わせます。
  - `name`: 参加者名の要素。Meet は名前を翻訳除けの `span.notranslate` に入れます
    （アイコンは `<i class="… notranslate">` なので `span` に限定しています）。
  - `audioBars`: 音声レベルの棒グラフ（既定 `.DYfzY, .IisKdb`）。発言判定はこの要素の
    **class が前回ポーリングから変化したか**（＝アニメ中か）で行います。単なる存在では
    判定しないため、無音のタイルを誤検出しません。

  Meet はクラス名を難読化し更新で変えるため、外れたら実データから特定するのが確実です。
  Meet タブの DevTools コンソールで、参加者タイル（`[data-participant-id]`）配下の
  「発言中に頻繁に class が変化する要素」を観測すれば、新しい `audioBars` / `name` を
  特定できます。

## 制限・今後

- 現状は best-effort の DOM 検出 + 手動固定。Meet Media API を使えば参加者ごとの
  音声・ID で堅牢に分離できます（Workspace / 開発者プレビューが前提）。
- Web Speech API はミックス音声を認識するため、複数人が同時に話すと取りこぼします。
  高精度化はクラウド STT（Whisper / Deepgram 等）への差し替えで対応予定。
