# SuperMeeting 🧠

Google Meet などのオンライン会議で、**リアルタイムに議事ノートを画面共有してファシリテーション**するための Web アプリです。
ブラウザ標準の音声認識で発話を書き起こし、AI が「要約・論点・決定事項・TODO・未解決の問い・議論の図示」へ自動整理します。

> 第一歩として **動く MVP の土台** を実装しています。音声書き起こし → AI 整理 → 画面共有用ボード、という主要フローが通っています。

## できること（現状）

- 🎙️ **音声書き起こし** — ブラウザ標準の Web Speech API（日本語 `ja-JP`、Chrome 推奨）。長時間会議向けに自動再開対応。
- 🗣️ **話者分離** — Chrome 拡張（`extension/`）が Google Meet の発言者を検出し、発話に話者ラベルを自動付与。
  拡張なしでも、参加者を登録して現在の発言者を手動で切り替えられる（半自動）。AI は話者を踏まえて TODO 担当を振り分ける。
- 📝 **議事の整理** — 現在の議論の要約。
- 🎯 **論点の提示** — 論点を `未着手 / 議論中 / 結論あり` のステータス付きで一覧。
- ✅ **決定事項の抽出**
- 📌 **TODO の抽出** — 担当者・期限を読み取れる範囲で付与。
- ❓ **未解決の問いの可視化**
- 🗺️ **議論の図示** — Mermaid 図でリアルタイムに構造化。
- 🔎 **調査・社内情報検索** — 論点・未解決の問いの「🔎」や自由入力から調査。
  Web 調査は Claude の `web_search` ツールで根拠リンク付きに（要 API キー）。
  社内情報検索は差し替え可能なプロバイダ設計＋モック（Drive/Slack/Confluence 等の実コネクタを後付け可能）。
- 🖥️ **画面共有前提のレイアウト** — 左に書き起こし、右に整理結果ボード＋調査パネル。

「✨ いま整理する」で即時分析、「自動更新」で 15 秒ごとに自動分析します。
マイクが使えない環境でも「サンプル投入」や手入力で動作確認できます。

## 動かし方

```bash
npm install
cp .env.example .env.local   # 任意: Claude API キーを設定
npm run dev
# http://localhost:3000
```

### AI エンジンについて

- **`ANTHROPIC_API_KEY` を設定した場合** … Claude（既定 `claude-opus-4-8`、`ANTHROPIC_MODEL` で変更可）が
  structured outputs を使って高精度に整理します。
- **未設定の場合** … サーバ側のルールベース分析にフォールバックし、キー無しでも動作します。
  UI のバッジで現在のエンジンを確認できます。

## 話者分離（Chrome 拡張）

別タブの Web アプリからは Meet タブの中（誰が発言中か）を覗けないため、
話者分離は **Meet タブの中で動く Chrome 拡張**が担当します。
インストールと使い方は [`extension/README.md`](extension/README.md) を参照してください。

- 拡張が Meet の発言者を検出し、書き起こしに話者を付けて本アプリへ送信
- Meet の DOM 変更に備え、オーバーレイで**手動固定**も可能（常に動作）
- 拡張なしでも、本アプリの話者バーで参加者登録＋現在の発言者の手動切替が可能

## アーキテクチャ

```
src/                         （Web アプリ）
  app/
    page.tsx                 画面全体（コントロール + 話者バー + 2カラム）
    api/analyze/route.ts     分析 API（POST /api/analyze）
    api/research/route.ts    調査 API（POST /api/research）
  hooks/
    useTranscription.ts      音声認識・話者付与・外部発話の取り込み
    useAnalysis.ts           分析の実行 / 自動更新
    useExtensionBridge.ts    Chrome 拡張からの話者付き発話を購読
    useResearch.ts           調査の実行
  lib/
    types.ts                 ドメイン型（書き起こし・分析結果・調査）
    speakers.ts              話者の色割り当て
    transcript.ts            話者ラベル付き整形（AI 入力）
    bridge.ts                拡張との postMessage プロトコル
    stt/                     音声認識（Web Speech API ラッパー、差し替え可能な設計）
    ai/
      analyze.ts             エンジン選択（Claude ↔ ルールベース）
      claude.ts              Claude 呼び出し（structured outputs）
      heuristic.ts           ルールベース・フォールバック
      prompt.ts              プロンプト + JSON スキーマ
    research/
      research.ts            調査のオーケストレーション（Web + 社内）
      web.ts                 Claude web_search による Web 調査
      internal.ts            社内情報源の抽象 + モック（実コネクタ差し替え可）
  components/                表示部品（ボード・各パネル・話者バー・調査・Mermaid 描画）

extension/                   （Chrome 拡張: 話者分離）
  manifest.json
  src/meet/content.js        Meet の発言者検出 + 書き起こし + オーバーレイ
  src/app/bridge.js          アプリ側へ window.postMessage で中継
  src/background.js          Meet タブ → アプリタブの中継
```

STT も AI も差し替えやすいよう層を分けています（例: Whisper / Deepgram への置換、別 LLM への切替）。

## 今後の拡張余地

- 高精度なクラウド音声認識（Whisper 等）／ Meet Media API による堅牢な話者分離
- 社内情報検索の実コネクタ（Slack / Drive / Confluence / Jira / Box の OAuth 連携）
- 分析結果・調査のストリーミング表示・差分更新
- 議事録のエクスポート（Markdown / Notion / Slack 投稿）
```
