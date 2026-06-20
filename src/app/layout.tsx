import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperMeeting — AI 会議ファシリテーター",
  description:
    "音声書き起こし・議事整理・論点提示・図示・TODO 抽出をリアルタイムで行う会議ファシリテーション支援アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
