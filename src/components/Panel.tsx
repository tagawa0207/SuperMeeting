import type { ReactNode } from "react";

/** ファシリテーション画面の各パネルの共通枠。 */
export function Panel({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <header className="mb-3 flex items-center gap-2">
        <span aria-hidden className="text-lg">
          {icon}
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">
          {title}
        </h2>
        {typeof count === "number" && count > 0 && (
          <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
            {count}
          </span>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
