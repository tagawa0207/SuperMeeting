"use client";

import type { MeetingAnalysis, TopicStatus } from "@/lib/types";
import { Panel } from "./Panel";
import { DiagramPanel } from "./DiagramPanel";

const STATUS_LABEL: Record<TopicStatus, string> = {
  open: "未着手",
  discussing: "議論中",
  resolved: "結論あり",
};

const STATUS_STYLE: Record<TopicStatus, string> = {
  open: "bg-slate-600 text-slate-100",
  discussing: "bg-amber-500/80 text-amber-950",
  resolved: "bg-emerald-500/80 text-emerald-950",
};

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

export function AnalysisBoard({
  analysis,
}: {
  analysis: MeetingAnalysis | null;
}) {
  if (!analysis) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center text-slate-500">
        <div>
          <p className="text-lg">まだ分析結果がありません。</p>
          <p className="mt-1 text-sm">
            録音を開始するか発言を入力し、「いま整理する」を押してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-min grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="議論の要約" icon="📝">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {analysis.summary || "（要約なし）"}
        </p>
      </Panel>

      <Panel title="論点" icon="🎯" count={analysis.topics.length}>
        {analysis.topics.length === 0 ? (
          <Empty text="論点はまだ抽出されていません。" />
        ) : (
          <ul className="space-y-3">
            {analysis.topics.map((topic, i) => (
              <li key={i} className="rounded-lg bg-slate-900/50 p-3">
                <div className="flex items-start gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[topic.status]}`}
                  >
                    {STATUS_LABEL[topic.status]}
                  </span>
                  <span className="text-sm font-medium text-slate-100">
                    {topic.title}
                  </span>
                </div>
                {topic.points.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {topic.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="決定事項" icon="✅" count={analysis.decisions.length}>
        {analysis.decisions.length === 0 ? (
          <Empty text="決定事項はまだありません。" />
        ) : (
          <ul className="space-y-1.5 text-sm text-slate-200">
            {analysis.decisions.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400">✔</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="TODO / アクション" icon="📌" count={analysis.todos.length}>
        {analysis.todos.length === 0 ? (
          <Empty text="TODO はまだ抽出されていません。" />
        ) : (
          <ul className="space-y-2 text-sm">
            {analysis.todos.map((todo, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-slate-900/50 p-2"
              >
                <span className="mt-0.5 text-sky-400">☐</span>
                <div className="flex-1">
                  <span className="text-slate-100">{todo.task}</span>
                  <div className="mt-1 flex gap-2 text-xs text-slate-400">
                    {todo.owner && (
                      <span className="rounded bg-slate-700 px-1.5 py-0.5">
                        👤 {todo.owner}
                      </span>
                    )}
                    {todo.due && (
                      <span className="rounded bg-slate-700 px-1.5 py-0.5">
                        📅 {todo.due}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="未解決の問い" icon="❓" count={analysis.questions.length}>
        {analysis.questions.length === 0 ? (
          <Empty text="未解決の問いはありません。" />
        ) : (
          <ul className="space-y-1.5 text-sm text-slate-200">
            {analysis.questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="議論の図示" icon="🗺️">
        <DiagramPanel code={analysis.diagram} />
      </Panel>
    </div>
  );
}
