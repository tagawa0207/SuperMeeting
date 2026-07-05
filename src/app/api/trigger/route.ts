import { NextResponse } from "next/server";
import type { TriggerRequest, TriggerResult } from "@/lib/types";
import { runTrigger } from "@/lib/ai/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Haiku の判定は通常 1 秒前後だが余裕を持たせる。
export const maxDuration = 30;

const NO_SEARCH: TriggerResult = { shouldSearch: false, tasks: [] };

export async function POST(request: Request) {
  let body: TriggerRequest;
  try {
    body = (await request.json()) as TriggerRequest;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const segments = Array.isArray(body.segments)
    ? body.segments.filter(
        (s) => s && typeof s.text === "string" && s.text.trim(),
      )
    : [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "発話がありません" }, { status: 400 });
  }

  const input: TriggerRequest = {
    segments,
    topicsSummary:
      typeof body.topicsSummary === "string" ? body.topicsSummary : undefined,
    recentQueries: Array.isArray(body.recentQueries)
      ? body.recentQueries.filter((q) => typeof q === "string")
      : [],
  };

  try {
    return NextResponse.json(await runTrigger(input));
  } catch (err) {
    console.error("トリガー判定に失敗:", err);
    // 自動レーンはベストエフォート。判定失敗は「検索しない」として静かに流す。
    return NextResponse.json(NO_SEARCH);
  }
}
