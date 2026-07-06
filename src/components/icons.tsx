// 細線 SVG アイコン（stroke 1.4–1.6 / round cap）。絵文字の代替として使う。
// 色は stroke="currentColor" で親のテキスト色を継承する。

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({
  size = 12,
  strokeWidth = 1.5,
  viewBox = "0 0 14 14",
  children,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="1.5" width="4" height="7" rx="2" />
      <path d="M2.8 6.5a4.2 4.2 0 0 0 8.4 0M7 10.7v2" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.6} {...props}>
      <circle cx="6" cy="6" r="3.8" />
      <path d="M9 9l3 3" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.8} {...props}>
      <path d="M2.5 7.5l3 3 6-7" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="5.4" />
      <path d="M7 4.2v3.2" />
      <circle cx="7" cy="9.8" r=".7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.4} {...props}>
      <circle cx="7" cy="7" r="5.4" />
      <path d="M1.6 7h10.8M7 1.6c-3 3.3-3 7.5 0 10.8 3-3.3 3-7.5 0-10.8z" />
    </Svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.4} {...props}>
      <path d="M3.2 1.5h5.2L11 3.7v8.8H3.2z" />
      <path d="M5.2 6.5h3.6M5.2 9h3.6" />
    </Svg>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.4} {...props}>
      <circle cx="7" cy="7" r="5.4" />
      <path d="M5.4 5.4a1.7 1.7 0 1 1 2.4 1.9c-.5.3-.8.6-.8 1.2" />
      <circle cx="7" cy="10.2" r=".7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.6} viewBox="0 0 12 12" {...props}>
      <path d="M3 4.5l3 3 3-3" />
    </Svg>
  );
}
