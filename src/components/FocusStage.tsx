"use client";

import { useEffect, useState } from "react";
import type { MeetingAnalysis, Topic } from "@/lib/types";
import { CheckIcon, HelpIcon, InfoIcon, SearchIcon } from "@/components/icons";
import { DiagramPanel } from "@/components/DiagramPanel";

type TabKey = "summary" | "todos" | "questions" | "diagram";

const STATUS_LABEL: Record<Topic["status"], string> = {
  discussing: "議論中",
  open: "未着手",
  resolved: "結論あり",
};

const STATUS_CHIP: Record<Topic["status"], string> = {
  discussing: "bg-amber-soft text-amber",
  open: "bg-softer text-ink-3",
  resolved: "bg-green-soft text-green",
};

function formatClock(at: number, withSeconds = false): string {
  return new Date(at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
  });
}

/** 「見出し: 本文」形式の観点を比較カラム用に分解する。 */
function splitPoint(point: string): { head: string | null; body: string } {
  const m = point.match(/^(.{1,24}?)[:：]\s*(.+)$/);
  return m ? { head: m[1].toUpperCase(), body: m[2] } : { head: null, body: point };
}

function buildMarkdown(a: MeetingAnalysis): string {
  const lines: string[] = ["# 議事録", "", "## 要約", a.summary, ""];
  if (a.topics.length > 0) {
    lines.push("## 論点");
    for (const tp of a.topics) {
      lines.push(`- 【${STATUS_LABEL[tp.status]}】${tp.title}`);
      tp.points.forEach((p) => lines.push(`  - ${p}`));
    }
    lines.push("");
  }
  if (a.decisions.length > 0) {
    lines.push("## 決定事項", ...a.decisions.map((d) => `- ${d}`), "");
  }
  if (a.todos.length > 0) {
    lines.push(
      "## TODO",
      ...a.todos.map((td) => {
        const meta = [
          td.owner ? `担当: ${td.owner}` : null,
          td.due ? `期限: ${td.due}` : null,
        ]
          .filter(Boolean)
          .join(" / ");
        return `- [ ] ${td.task}${meta ? `（${meta}）` : ""}`;
      }),
      "",
    );
  }
  if (a.questions.length > 0) {
    lines.push("## 未解決の問い", ...a.questions.map((q) => `- ${q}`), "");
  }
  return lines.join("\n");
}

function Stat({
  n,
  label,
  tone = "text-ink",
}: {
  n: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline gap-[7px]">
      <span className={`text-[19px] font-extrabold tabular-nums ${tone}`}>
        {n}
      </span>
      <span className="text-xs text-ink-4">{label}</span>
    </div>
  );
}

/** 中央カラム。いま議論中の論点のヒーローカード + 要約/決定&TODO/問い/図のタブカード。 */
export function FocusStage({
  analysis,
  lastAnalyzedAt,
  onResearch,
}: {
  analysis: MeetingAnalysis;
  lastAnalyzedAt: number | null;
  onResearch: (query: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  // TODO のチェックは UI 上のトグルのみ（分析結果は上書きされるためローカルで保持）。
  const [checkedTodos, setCheckedTodos] = useState<Record<string, boolean>>({});
  // 「決定 HH:MM」用: 決定事項が初めて現れた時刻を記録する。
  const [decidedAt, setDecidedAt] = useState<Record<string, number>>({});
  useEffect(() => {
    const timer = setTimeout(() => {
      setDecidedAt((prev) => {
        const missing = analysis.decisions.filter((d) => !(d in prev));
        if (missing.length === 0) return prev;
        const next = { ...prev };
        const at = Date.now();
        missing.forEach((d) => {
          next[d] = at;
        });
        return next;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [analysis.decisions]);

  const topics = analysis.topics;
  const heroIdx = Math.max(
    topics.findIndex((tp) => tp.status === "discussing"),
    0,
  );
  const hero: Topic | undefined = topics[heroIdx];
  const nextDecision = analysis.questions[0];

  const points = hero?.points ?? [];
  const mid = Math.ceil(points.length / 2);
  const compareCols =
    points.length >= 2 ? [points.slice(0, mid), points.slice(mid)] : null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "summary", label: "要約", count: 0 },
    {
      key: "todos",
      label: "決定 & TODO",
      count: analysis.decisions.length + analysis.todos.length,
    },
    { key: "questions", label: "問い", count: analysis.questions.length },
    { key: "diagram", label: "図", count: 0 },
  ];

  const exportMarkdown = () => {
    const blob = new Blob([buildMarkdown(analysis)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `議事録-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPoint = (pt: string) => {
    const { head, body } = splitPoint(pt);
    return (
      <div key={pt}>
        {head && (
          <p className="text-[11.5px] font-extrabold tracking-[.08em] text-ink-2">
            {head}
          </p>
        )}
        <p
          className={`text-[13.5px] leading-[1.75] text-[#3B382F] ${head ? "mt-[7px]" : ""}`}
        >
          {body}
        </p>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-3.5">
      {hero && (
        <div className="flex-none animate-sm-in rounded-[14px] border border-line bg-white px-[30px] py-[26px] shadow-[0_1px_3px_rgba(25,22,18,.05)]">
          <div className="flex items-center gap-2.5">
            <span
              className={`rounded-full px-[9px] py-[2.5px] text-[11px] font-bold tracking-[.03em] ${STATUS_CHIP[hero.status]}`}
            >
              {STATUS_LABEL[hero.status]}
            </span>
            <span className="text-[11.5px] text-ink-4">
              論点 {heroIdx + 1} / {topics.length}
            </span>
            {lastAnalyzedAt && (
              <span className="ml-auto text-[11.5px] text-ink-5 tabular-nums">
                最終更新 {formatClock(lastAnalyzedAt, true)}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-[29px] leading-[1.3] font-extrabold tracking-[-.02em]">
            {hero.title}
          </h2>
          {compareCols ? (
            <div className="mt-[18px] grid grid-cols-2 border-t border-line-soft">
              <div className="flex flex-col gap-3 border-r border-line-soft pt-3.5 pr-[22px] pb-1">
                {compareCols[0].map(renderPoint)}
              </div>
              <div className="flex flex-col gap-3 pt-3.5 pb-1 pl-[22px]">
                {compareCols[1].map(renderPoint)}
              </div>
            </div>
          ) : points.length === 1 ? (
            <div className="mt-[18px] border-t border-line-soft pt-3.5 pb-1">
              {renderPoint(points[0])}
            </div>
          ) : null}
          {nextDecision && (
            <div className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-accent-line bg-accent-soft px-4 py-[11px]">
              <span className="flex-none text-accent">
                <InfoIcon size={14} />
              </span>
              <span className="text-[13px] font-semibold text-accent-deep">
                次に決めること: {nextDecision}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_1px_3px_rgba(25,22,18,.05)]">
        <div className="flex flex-none items-baseline gap-[26px] border-b border-line-soft px-[30px] pt-4">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={
                  active
                    ? "-mb-px border-b-2 border-accent pb-[11px] text-[13px] font-bold text-ink"
                    : "pb-3 text-[13px] text-ink-4 transition-colors hover:text-ink"
                }
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-4">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[30px] pt-2 pb-4">
          {activeTab === "summary" && (
            <>
              <p className="mt-3 text-[14.5px] leading-[1.9] text-[#3B382F]">
                {analysis.summary}
              </p>
              <div className="mt-4 flex items-center gap-5 border-t border-line-soft pt-3.5">
                <Stat n={topics.length} label="論点" />
                <Stat
                  n={analysis.decisions.length}
                  label="決定"
                  tone="text-green"
                />
                <Stat n={analysis.todos.length} label="TODO" />
                <Stat
                  n={analysis.questions.length}
                  label="未解決の問い"
                  tone="text-amber"
                />
                <button
                  onClick={exportMarkdown}
                  className="ml-auto text-xs font-semibold text-accent transition-colors hover:text-accent-deep"
                >
                  議事録をエクスポート ↗
                </button>
              </div>
            </>
          )}

          {activeTab === "todos" &&
            (analysis.decisions.length + analysis.todos.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-4">
                決定事項・TODO はまだ抽出されていません。議論が進むとここに積まれます。
              </p>
            ) : (
              <>
                {analysis.decisions.map((d) => (
                  <div
                    key={d}
                    className="flex animate-sm-in items-center gap-3.5 border-b border-line-soft py-[15px]"
                  >
                    <span className="flex-none text-green">
                      <CheckIcon size={15} />
                    </span>
                    <span className="flex-1 text-sm">{d}</span>
                    {decidedAt[d] && (
                      <span className="text-[11.5px] text-ink-4 tabular-nums">
                        決定 {formatClock(decidedAt[d])}
                      </span>
                    )}
                  </div>
                ))}
                {analysis.todos.map((td) => {
                  const checked = !!checkedTodos[td.task];
                  return (
                    <div
                      key={td.task}
                      className="flex animate-sm-in items-center gap-3.5 border-b border-line-soft py-[15px]"
                    >
                      <button
                        onClick={() =>
                          setCheckedTodos((prev) => ({
                            ...prev,
                            [td.task]: !prev[td.task],
                          }))
                        }
                        className={`grid h-4 w-4 flex-none place-items-center rounded-[5px] border-[1.5px] ${
                          checked
                            ? "border-green bg-green text-white"
                            : "border-ink-5 bg-white"
                        }`}
                      >
                        {checked && <CheckIcon size={10} strokeWidth={2.4} />}
                      </button>
                      <span
                        className={`flex-1 text-sm ${checked ? "text-ink-4 line-through" : ""}`}
                      >
                        {td.task}
                      </span>
                      {td.owner && (
                        <span
                          className={`rounded-full px-[9px] py-0.5 text-[11px] font-bold ${
                            td.due
                              ? "bg-amber-soft text-amber"
                              : "bg-green-soft text-green"
                          }`}
                        >
                          {td.owner}
                        </span>
                      )}
                      <span
                        className={`text-[11.5px] ${td.due ? "text-ink-4" : "text-ink-5"}`}
                      >
                        {td.due ?? "期限未定"}
                      </span>
                    </div>
                  );
                })}
              </>
            ))}

          {activeTab === "questions" &&
            (analysis.questions.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-4">
                未解決の問いはありません。
              </p>
            ) : (
              <>
                {analysis.questions.map((q) => (
                  <div
                    key={q}
                    className="flex animate-sm-in items-center gap-3.5 border-b border-line-soft py-4"
                  >
                    <span className="h-[7px] w-[7px] flex-none rounded-full bg-[#C08A2D]" />
                    <p className="flex-1 text-sm">{q}</p>
                    <button
                      onClick={() => onResearch(q)}
                      className="flex flex-none items-center gap-1.5 rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-line"
                    >
                      <SearchIcon size={11} />
                      調べる
                    </button>
                  </div>
                ))}
                <div className="mt-3 flex items-center gap-[9px] rounded-[10px] border border-dashed border-line-dash bg-soft px-4 py-3">
                  <span className="flex-none text-ink-4">
                    <HelpIcon size={13} />
                  </span>
                  <span className="text-[12.5px] text-ink-4">
                    解決した問いは自動でこのリストから消えます
                  </span>
                </div>
              </>
            ))}

          {activeTab === "diagram" && (
            <div className="pt-4">
              <DiagramPanel code={analysis.diagram} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
