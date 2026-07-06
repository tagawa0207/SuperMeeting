"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;
let renderSeq = 0;

/**
 * Mermaid 記法の文字列を SVG として描画する。
 * mermaid は SSR 不可なので動的 import + クライアント描画にする。
 */
export function DiagramPanel({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const trimmed = code?.trim();
    if (!trimmed) {
      setSvg("");
      setError(null);
      return;
    }

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "strict",
          });
          mermaidInitialized = true;
        }
        const id = `mmd-${++renderSeq}`;
        const { svg: rendered } = await mermaid.render(id, trimmed);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("図の描画に失敗しました（記法エラーの可能性）");
          setSvg("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code?.trim()) {
    return (
      <p className="text-[13px] text-ink-4">まだ図にできる材料がありません。</p>
    );
  }

  if (error) {
    return (
      <div className="text-[13px] text-amber">
        {error}
        <pre className="mt-2 overflow-auto rounded-lg border border-line-soft bg-soft p-2 text-xs text-ink-3">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center overflow-auto [&_svg]:max-w-full"
      // mermaid が生成した安全な SVG を描画する（securityLevel: strict）。
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
