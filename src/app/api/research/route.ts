import { NextResponse } from "next/server";
import type { ResearchRequest } from "@/lib/types";
import { runInternalResearch, runWebResearch } from "@/lib/research/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// web_search のサーバーループに時間がかかることがあるため余裕を持たせる。
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: ResearchRequest;
  try {
    body = (await request.json()) as ResearchRequest;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const query = (body.query || "").trim();
  if (!query) {
    return NextResponse.json({ error: "調査クエリが空です" }, { status: 400 });
  }
  if (body.target !== "web" && body.target !== "internal") {
    return NextResponse.json(
      { error: "target には web または internal を指定してください" },
      { status: 400 },
    );
  }

  try {
    const result =
      body.target === "web"
        ? await runWebResearch(query)
        : await runInternalResearch(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("調査に失敗:", err);
    return NextResponse.json(
      { error: "調査中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
