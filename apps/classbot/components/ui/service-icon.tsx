import * as React from "react";

export type ServiceIconName =
  | "studio" | "store" | "planner" | "classbot" | "q"
  | "games" | "exam" | "writing" | "library" | "reader" | "pullim";

const LABELS: Record<ServiceIconName, string> = {
  studio: "풀림 스튜디오",
  store: "풀림 스토어",
  planner: "풀림 플래너",
  classbot: "풀림 클래스봇",
  q: "풀림 Q",
  games: "풀림 게임",
  exam: "풀림 입시",
  writing: "풀림 라이팅",
  library: "풀림 라이브러리",
  reader: "풀림 리더",
  pullim: "풀림 OS",
};

const GLYPHS: Record<ServiceIconName, React.ReactNode> = {
  studio: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="22" y="30" width="56" height="8" fill="#FFFFFF" />
      <rect x="22" y="62" width="56" height="8" fill="#FFFFFF" />
      <rect x="22" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="70" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="38" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="30" y="70" width="40" height="8" fill="#FFFFFF" />
      <rect x="54" y="38" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  store: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="38" y="30" width="24" height="8" fill="#FFFFFF" />
      <rect x="30" y="38" width="40" height="32" fill="#FFFFFF" />
      <rect x="22" y="70" width="56" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  planner: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="22" y="30" width="56" height="8" fill="#FFFFFF" />
      <rect x="22" y="70" width="56" height="8" fill="#FFFFFF" />
      <rect x="22" y="38" width="8" height="32" fill="#FFFFFF" />
      <rect x="70" y="38" width="8" height="32" fill="#FFFFFF" />
      <rect x="30" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="30" y="54" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="54" width="8" height="8" fill="#E6FF4C" />
      <rect x="62" y="54" width="8" height="8" fill="#FFFFFF" />
      <rect x="30" y="62" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="62" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="62" width="8" height="8" fill="#FFFFFF" />
    </>
  ),
  classbot: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="30" width="40" height="8" fill="#FFFFFF" />
      <rect x="30" y="62" width="40" height="8" fill="#FFFFFF" />
      <rect x="30" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="62" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="38" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="54" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="54" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="22" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  q: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="22" width="40" height="8" fill="#FFFFFF" />
      <rect x="30" y="30" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="30" width="8" height="8" fill="#FFFFFF" />
      <rect x="54" y="38" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="54" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="70" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  games: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="38" y="46" width="24" height="8" fill="#FFFFFF" />
      <rect x="46" y="38" width="8" height="24" fill="#FFFFFF" />
      <rect x="30" y="30" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="30" width="8" height="8" fill="#FFFFFF" />
      <rect x="30" y="62" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="62" width="8" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  exam: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="62" width="8" height="8" fill="#FFFFFF" />
      <rect x="38" y="54" width="8" height="16" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="24" fill="#FFFFFF" />
      <rect x="54" y="38" width="8" height="32" fill="#FFFFFF" />
      <rect x="62" y="30" width="8" height="40" fill="#FFFFFF" />
      <rect x="62" y="22" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  writing: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="22" width="40" height="8" fill="#FFFFFF" />
      <rect x="30" y="70" width="40" height="8" fill="#FFFFFF" />
      <rect x="30" y="30" width="8" height="40" fill="#FFFFFF" />
      <rect x="62" y="30" width="8" height="40" fill="#FFFFFF" />
      <rect x="38" y="38" width="24" height="8" fill="#FFFFFF" />
      <rect x="38" y="46" width="24" height="8" fill="#FFFFFF" />
      <rect x="38" y="54" width="16" height="8" fill="#FFFFFF" />
      <rect x="38" y="62" width="24" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  library: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="38" width="8" height="32" fill="#FFFFFF" />
      <rect x="46" y="30" width="8" height="40" fill="#FFFFFF" />
      <rect x="62" y="38" width="8" height="32" fill="#FFFFFF" />
      <rect x="22" y="70" width="56" height="8" fill="#FFFFFF" />
      <rect x="46" y="46" width="8" height="8" fill="#E6FF4C" />
    </>
  ),
  reader: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="22" y="26" width="56" height="6" fill="#FFFFFF" />
      <rect x="22" y="34" width="26" height="8" fill="#FFFFFF" />
      <rect x="22" y="42" width="26" height="8" fill="#FFFFFF" />
      <rect x="22" y="50" width="18" height="8" fill="#FFFFFF" />
      <rect x="52" y="34" width="26" height="8" fill="#FFFFFF" />
      <rect x="52" y="42" width="20" height="8" fill="#FFFFFF" />
      <rect x="64" y="60" width="14" height="10" fill="#E6FF4C" />
    </>
  ),
  pullim: (
    <>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <g transform="translate(26,27)" fill="#FFFFFF">
        <path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
      </g>
      <rect x="74" y="14" width="9" height="9" fill="#E6FF4C" />
    </>
  ),
};

export interface ServiceIconProps extends React.SVGProps<SVGSVGElement> {
  name: ServiceIconName;
  size?: number;
}

export function ServiceIcon({ name, size = 100, ...rest }: ServiceIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={LABELS[name]}
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  );
}
