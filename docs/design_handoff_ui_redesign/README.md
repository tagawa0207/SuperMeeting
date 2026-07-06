# Handoff: SuperMeeting UI/UX 刷新（ライト × ミニマル「3a」テイスト）

## Overview
SuperMeeting（Google Meet 画面共有前提の会議ファシリテーションアプリ、Next.js + Tailwind）の全画面 UI 刷新。
現行のダーク slate + 絵文字アイコンの MVP UI を、**ライトテーマ / プロフェッショナル&ミニマル（Linear/Notion 系）** に置き換える。
レイアウトも 2 カラムから **「フォーカスモード」構成**（左: 論点の流れ / 中央: いま議論中の論点 + タブ / 右: ライブリサーチ / 下: 書き起こしテロップ）へ再構成する。

## About the Design Files
このバンドルの `.dc.html` ファイルは **HTML で作られたデザインリファレンス**（意図する見た目・挙動を示すプロトタイプ）であり、そのまま流用する本番コードではない。
タスクは、これらのデザインを **既存コードベース（Next.js App Router + Tailwind CSS + React）の流儀で再実装**すること。既存の hooks（`useTranscription` / `useAnalysis` / `useResearchFeed` / `useAutoResearch` / `useExtensionBridge`）と型（`src/lib/types.ts`）はそのまま活かし、**表示層（`src/app/page.tsx` と `src/components/*`）を刷新**する。

- `SuperMeeting Prototype.dc.html` — **正**となる最終デザイン。インタラクション込みの動くプロトタイプ（サンプル会議再生、タブ、ドロワー、リサーチカードの状態遷移）。
- `SuperMeeting Redesign.dc.html` — 探索過程のオプション集。**セクション「3」(id=3a) と「4」(4a〜4f)** が採用テイスト。他タブ・空状態・エラー状態の詳細リファレンスとして参照（1a/1b/2a/2b は不採用案）。

## Fidelity
**High-fidelity（hifi）**。色・タイポ・余白・角丸・状態はピクセル基準で再現すること。ただし実装は Tailwind のユーティリティに正規化してよい（下の Design Tokens を tailwind の任意値または theme 拡張で表現）。

## 全体レイアウト（メイン画面）
- ルート: `100vh` の縦 flex。`bg #F5F4F1` / `text #1B1A18`
- フォント: `"Helvetica Neue", Helvetica, "Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif`（現行 globals.css を置換）
- 構成（上から）:
  1. **ヘッダー** h=58px, px=24, 下線 `1px #E6E4DF`
  2. **メイングリッド** `grid-template-columns: 290px 1fr 330px; gap:16px; padding:18px 24px`
  3. **ライブテロップ** h=62px, `bg #1E1C19`（常時最下部・ダーク）

### 1. ヘッダー
- 左: ロゴ（24px 角丸7px `#3A55C4` の正方形、中に白枠 9px の角丸小四角）+ ワードマーク「SuperMeeting」15px/700 + 会議名 13px `#6B675F`
- 右: 録音中のみ REC インジケータ（8px 赤丸 `#D2452F` pulse + 経過時間 `00:MM:SS` tabular-nums）/ エンジンバッジ（白 pill、緑ドット + "Claude"）/ 主ボタン「いま整理する」（`bg #3A55C4`、hover `#2B3E9C`、白字 13px/600、radius 8px、px16 py8）/ 「自動更新」トグル付きセカンダリボタン（白、`border #E6E4DF`）
- 絵文字は全廃。アイコンは 1.4〜1.6px ストロークの細線 SVG（lucide 等の line icon セット推奨）

### 2. 左カラム「論点の流れ」
- セクション見出し: 11px/700, letter-spacing .12em, `#A6A199`
- 論点カード（`analysis.topics` を状態別スタイルで縦積み）:
  - **議論中**: `bg #fff`, `border 1px #3A55C4`, `box-shadow 0 0 0 3px rgba(58,85,196,.08)`, 番号バッジは塗り `#3A55C4`/白字。サブテキスト「いま議論中 · N分経過」12px/600 `#3A55C4`
  - **結論あり**: 白カード `border #E6E4DF`、番号の代わりにチェックアイコン（`#1E8A5C` on `#E9F5EF` 丸）。タイトル `#6B675F`、サブ「結論: …」`#A6A199`
  - **未着手**: 背景透明 + `border 1px dashed #D6D2C9`、全体グレートーン
- 最下部に「参加者」カード: 白カード内に話者チップ（pill、6px 色ドット + 名前 12px、`bg #F0EFEA`）+ 破線の「+ 追加」

### 3. 中央「フォーカスステージ」
- **ヒーローカード**（いま議論中の論点）: 白カード radius 14px, `border #E6E4DF`, shadow `0 1px 3px rgba(25,22,18,.05)`, padding 22-28px
  - ステータスチップ「議論中」11px/700 `#96690F` on `#FBF1DC` pill + 「論点 n / N」+ 右端「最終更新 HH:MM:SS」
  - タイトル: **29〜32px / 800 / letter-spacing -.02em / line-height 1.3**（この大見出しがデザインの核）
  - 比較 2 カラム: `border-top 1px #ECEAE4` の下、中央罫 `1px #ECEAE4` で分割。見出しは大文字 11.5px/800 tracking .08em
  - 「次に決めること」バナー: `bg #EDF0FB` / `border #D9DFF6` / 文字 `#2B3E9C` 13px/600 + info 線アイコン
- **タブカード**: 白カード。タブは下線式 — アクティブ: 13px/700 `#1B1A18` + `border-bottom 2px #3A55C4`、非アクティブ: `#A6A199`。件数は 11px `#A6A199`
  - タブ構成: 要約 / 決定 & TODO / 問い / 図
  - **要約**: 本文 14.5px lh1.9 `#3B382F`。下部に件数サマリー行（数字 19-20px/800、決定=緑、問い=琥珀）+「議事録をエクスポート ↗」リンク
  - **決定 & TODO**: 行区切り `1px #ECEAE4`。決定行=緑チェックアイコン + 右端「決定 HH:MM」。TODO 行=角丸5pxチェックボックス（`border 1.5px #C4C0B7`、チェック時 `bg #1E8A5C` 白チェック + テキスト打ち消し線 `#A6A199`）+ 担当者 pill（琥珀 `#96690F`/`#FBF1DC` または緑 `#1E8A5C`/`#E9F5EF`）+ 期限
  - **問い**: 各行 = 琥珀ドット 7px + 問い 14px + 出典メタ 11.5px `#A6A199`（論点/発言者/時刻）+「調べる」ボタン（`bg #EDF0FB` `border #D9DFF6` `#3A55C4`、虫眼鏡線アイコン）→ 右カラムに手動リサーチカードを積む
  - **図**: Mermaid 描画枠（現行 `DiagramPanel` を流用、ライトテーマ `theme:"neutral"` 等に変更）。空時は「まだ図にできる材料がありません」13px `#A6A199`
- **空状態**（分析なし）: 中央カード内に 48px 角丸14px `#EDF0FB` のマイク線アイコン + 「会議を始めましょう」21px/800 + 説明 13.5px lh1.9 + 主ボタン

### 4. 右カラム「ライブリサーチ」（ResearchCard フィード）
- 見出し行: ラベル + 「自動」トグルスイッチ（28×16px pill、ON=`#3A55C4`）
- カード（新着が上、`animation: fadeIn+translateY(6px) .4s`）:
  - ヘッダー行: 出所バッジ「WEB」(`#3A55C4` on `#EDF0FB`) / 「社内」(`#96690F` on `#FBF1DC`) 10.5px/700 + トリガーバッジ「自動/手動」（outline）+ 右端ステータス
  - **検索中**: `border #D9DFF6` + `box-shadow 0 0 0 3px rgba(58,85,196,.06)`、青ドット pulse + 「検索中」11px/600 `#3A55C4`
  - **完了**: `border #E6E4DF`、右端に時刻。クエリ 13.5px/700 → 要約 12.5px lh1.7 `#565248` → ソースは `border-top 1px #ECEAE4` 区切りで地球/ドキュメント線アイコン + タイトル 12px/600 `#3A55C4`（truncate）
  - **エラー**: `border #F0D4D4` / `bg #FDF7F7`、「エラー」`#B33A3A` + 本文内に下線「再試行」
  - 自動カードには発端発言の引用 11px `#C4C0B7`「発言:「…」」
  - 折りたたみ（古いカード）: 1 行表示 `bg #FBFAF7` + シェブロン
- 最下部: 検索入力（白、focus で `border #3A55C4`）+「調べる」ボタン
- 空状態: 破線枠 + 説明テキスト中央寄せ

### 5. ライブテロップ + 書き起こしドロワー
- テロップ: `bg #1E1C19`。「LIVE」ラベル（赤ドット pulse + 11px/700 tracking .08em `#A6A199`）+ 話者チップ（話者色の半透明 bg + 話者色文字）+ 最新確定発話 15.5px `#F3F1EC`（1行 truncate）+ 右端「全文を見る ↗」
- 待機時: グレードット + 「STANDBY」+ 案内文 `#8A857C`
- **ドロワー**（「全文を見る」で展開）: 画面下 56% のダークシート `#1E1C19`、radius 20px 20px 0 0、上に `rgba(30,28,25,.25)` のスクリム（クリックで閉じる）。ヘッダーに発話数・経過時間・検索ボックス・閉じるボタン。本文は「時刻(右寄せ 64px 幅 tabular) | 話者名(ダーク用話者色)/発話 14px lh1.7 `#D8D5CE`」の 2 カラム行。下部に手入力欄

## Interactions & Behavior
- タブ切替: 即時。下線 2px のみ移動
- 新規要素の出現（論点カード・リサーチカード・決定/TODO 行）: `opacity 0→1 + translateY(6px→0)` 0.35〜0.4s ease
- pulse（REC・LIVE・検索中ドット): opacity 1→.35 1.2〜1.6s 無限
- ドロワー: `translateY(100%)→0` 0.3s ease。スクリムクリック / ボタンで閉じる
- トグルスイッチ: ノブ left 2px↔14px + 背景色 0.2s
- ボタン hover: 主 `#3A55C4→#2B3E9C`、黒 `#1E1C19→#3B382F`、白系は `bg #F0EFEA`
- 書き起こしは新着で最下部へ自動スクロール（現行実装踏襲。ただし `scrollTo` を使用）
- TODO チェックは UI 上のトグルのみ（分析結果は上書きされるためローカル state で保持）

## State Management
既存 hooks をそのまま利用。新規に必要なもの:
- `activeTab: "summary" | "todos" | "questions" | "diagram"`
- `drawerOpen: boolean`（書き起こしドロワー）
- `checkedTodos: Record<string, boolean>`（ローカル）
- 「いま議論中」論点 = `analysis.topics` の `status === "discussing"` の先頭。なければ先頭論点をヒーローに表示
- 「次に決めること」= 未解決の問いの先頭から生成（または analysis スキーマに `nextDecision` を追加検討）

## Design Tokens
```
背景         #F5F4F1   カード面      #FFFFFF   淡面        #FBFAF7 / #F0EFEA
罫線         #E6E4DF   カード内罫線   #ECEAE4   破線        #D6D2C9
文字主       #1B1A18   文字副        #565248 / #6B675F
文字弱       #A6A199   文字最弱      #C4C0B7
アクセント    #3A55C4   hover        #2B3E9C   淡bg #EDF0FB  淡border #D9DFF6
緑(決定)     #1E8A5C   淡bg #E9F5EF   琥珀(議論中/社内) #96690F  淡bg #FBF1DC
赤(REC/エラー) #D2452F / #B33A3A(文字) #F0D4D4(枠) #FDF7F7(bg)
ダーク面(テロップ/ドロワー) #1E1C19  ダーク文字 #F3F1EC / #D8D5CE / #A6A199 / #8A857C
話者色 light: 司会 #3A55C4 / 田中 #1E8A5C / 佐藤 #C08A2D / 鈴木 #8E5BB8
話者色 dark:  司会 #7E96E8 / 田中 #6FC9A0 / 佐藤 #E8BE71 / 鈴木 #B48BD6
  （speakers.ts のパレットをこの2系統に置換。ライト面では light、ダーク面では dark を使用）
角丸: カード 12-14px / ボタン・入力 8-10px / チップ pill / バッジ 5px
影: カード 0 1px 2-3px rgba(25,22,18,.04-.05) / 選択リング 0 0 0 3px rgba(アクセント,.06-.08)
タイポ: 見出し(ヒーロー) 29-32px/800/-.02em、カード見出し 11px/700/.12em、本文 13-14.5px、メタ 11-12px、数値は tabular-nums
```

## Assets
- 外部画像なし。アイコンは全て細線 SVG（stroke 1.4–1.6, round cap）。lucide-react の `mic / search / check / circle-help / info / globe / file-text / chevron-down / more-vertical` で代替可
- ロゴ: `#3A55C4` 角丸正方形 + 白枠小四角（コードで描画）

## Files
- `SuperMeeting Prototype.dc.html` — 最終デザイン（動くプロトタイプ、実装の正）
- `SuperMeeting Redesign.dc.html` — 探索キャンバス。セクション 3(3a)=確定テイスト、セクション 4(4a〜4f)=各タブ・空状態・ドロワー・リサーチカード状態のリファレンス

両ファイルとも `<x-dc>` 内の HTML がデザイン本体（インラインスタイル）。`support.js` はプレビュー用ランタイムのため無視してよい。
