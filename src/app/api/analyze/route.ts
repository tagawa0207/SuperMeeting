import { NextResponse } from "next/server";
import type { AnalyzeRequest } from "@/lib/types";
import { analyzeTranscript } from "@/lib/ai/analyze";

export const runtime = "nodejs";
// 分析のたびに新規実行する。キャッシュしない。
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const transcript = (body.transcript || "").trim();
  if (!transcript) {
    return NextResponse.json(
      { error: "書き起こしが空です" },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeTranscript(transcript);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("分析に失敗:", err);
    return NextResponse.json(
      { error: "分析中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
