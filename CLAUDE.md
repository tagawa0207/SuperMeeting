# CLAUDE.md — SuperMeeting

このファイルは Claude Code / 開発者向けのプロジェクト・ハンドオフ資料です。

## 概要（ゴール）

Google Meet などのオンライン会議で、**リアルタイムに議事ノートを画面共有してファシリテーション**するための Web アプリ。
音声を書き起こし、AI が「要約 / 論点 / 決定事項 / TODO / 未解決の問い / 議論の図示 / 調査・社内情報検索」に整理する。

## 技術スタック

- Next.js 16（App Router, Turbopack）+ React 19 + TypeScript
- Tailwind CSS v4（`@tailwindcss/postcss`、`src/app/globals.css` は `@import "tailwindcss";`）
- `@anthropic-ai/sdk`（Claude、structured outputs / web_search）
- `mermaid`（議論の図示、クライアント描画）
- UI 文言は日本語

## 起動・確認

```bash
npm install
npm run dev        # http://localhost:3000（マイク・拡張は Chrome 推奨）
npm run build      # 本番ビルド
npm run typecheck  # tsc --noEmit
```

- **AI キーは任意**。`ANTHROPIC_API_KEY`（+任意で `ANTHROPIC_MODEL`、既定 `claude-opus-4-8`）を `.env.local` に入れると Claude が有効。
  未設定でも**ルールベースに自動フォールバック**して動く（UI にエンジンのバッジ表示）。
- dev モードは API ルート初回アクセス時にオンデマンドコンパイル（左下 "Compiling…"）。初回だけ応答が遅い。
- マイク音声認識（Web Speech API）と Chrome 拡張は**実ブラウザ（Chrome）でのみ動作**。ヘッドレス不可。

## アーキテクチャ

```
src/
  app/
    page.tsx                 画面全体（コントロール + 話者バー + 2カラム + 調査パネル）
    api/analyze/route.ts     分析 API（POST /api/analyze）
    api/research/route.ts    調査 API（POST /api/research）
  hooks/
    useTranscription.ts      音声認識・話者付与・外部発話取り込み・言語切替
    useAnalysis.ts           分析の実行 / 自動更新（AbortController タイムアウト付き）
    useExtensionBridge.ts    Chrome 拡張からの話者付き発話を購読（window.postMessage）
    useResearch.ts           調査の実行（タイムアウト付き）
  lib/
    types.ts                 ドメイン型（書き起こし / 分析 / 調査）
    speakers.ts              話者の色割り当て
    transcript.ts            話者ラベル付き整形（AI 入力）+ knownSpeakers
    bridge.ts                拡張との postMessage プロトコル
    stt/                     音声認識（Web Speech API ラッパー、差し替え可能）
    ai/
      analyze.ts             エンジン選択（Claude ↔ ルールベース、失敗時フォールバック）
      claude.ts              Claude 呼び出し（structured outputs, hasClaudeKey）
      heuristic.ts           ルールベース・フォールバック分析
      prompt.ts              システムプロンプト + JSON スキーマ
    research/
      research.ts            調査オーケストレーション（Web + 社内）
      web.ts                 Claude web_search による Web 調査
      internal.ts            社内情報源の抽象 InternalKnowledgeSource + モック
      slack.ts               Slack コネクタ（search.messages、public 限定フィルタ）
  components/                ボード / 各パネル / 話者バー / 調査 / Mermaid 描画

extension/                   Chrome 拡張（MV3・ビルド不要）: 話者分離
  manifest.json
  src/meet/content.js        Meet の発言者検出 + 書き起こし + オーバーレイ（手動固定可）
  src/app/bridge.js          アプリ側へ window.postMessage で中継
  src/background.js          Meet タブ → アプリタブの中継
```

## 設計上の約束（変更時に守る）

- **エンジンは常にフォールバック可能に**：キーが無くても heuristic / mock で動くこと。
- **STT / LLM は層分離**：将来 Whisper・Deepgram や別 LLM に差し替えやすく保つ。
- **話者は `TranscriptSegment.speaker`（文字列）**。AI へは「話者名: 発言」形式（`formatTranscriptForAI`）で渡す。
- **structured outputs のスキーマ制約**：`additionalProperties:false` と `required` を全オブジェクトに。文字列長・数値制約は使わない。
- 別タブの Web アプリからは Meet 内を覗けないため、**話者分離は Meet タブ内で動く拡張が担当**（手動固定が確実なフォールバック）。

## 現状（実装済み）

当初の理想8機能はすべて動作：
書き起こし / 話者分離（拡張の自動＋手動、AI 担当振り分け）/ 議事整理 / 論点 / 決定・TODO / 図示 / 調査（Web検索）/ 社内情報検索（Slack 実コネクタ。`SLACK_USER_TOKEN` 未設定時はモック）。

## 仕様・アイデアの置き場

- 「何を作るか / なぜそう決めたか / これから何を検討するか」は **`docs/SPEC.md`** に集約する。
  壁打ちで決めたことは決定ログへ、未確定はバックログ／未解決の論点へ追記する（会話は揮発、ファイルが永続の共有知識）。

## 次の候補（未実装・磨き込み）

- 議事録エクスポート（Markdown / Slack 投稿 / Notion）
- 社内検索の追加コネクタ（Drive / Confluence / Jira / Box。Slack は実装済み `src/lib/research/slack.ts`）
- 高精度クラウド STT（Whisper 等）、同時発話への耐性
- Meet 拡張の自動話者検出セレクタの追従（`extension/src/meet/content.js` の `SELECTORS`）。
  2026-07 時点の実 Meet DOM に合わせ済み（名前 `span.notranslate` / 発言判定は `audioBars` の
  class 変化）。Meet 更新で難読クラスが変わったら DevTools で再特定して更新する。
- 分析・調査のストリーミング表示 / 差分更新

## Git

- 開発ブランチ: `claude/meet-facilitator-app-ei5ce0`（メインには未マージ）
- 複数環境で編集する場合は、作業前に `git pull`、作業後に `git push` で同期する。
