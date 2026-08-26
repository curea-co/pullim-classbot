import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * SkipLink — WCAG 2.4.1 (Bypass Blocks) compliance.
 *
 * Hidden until focused. First focusable element in the page. Lets keyboard
 * users jump past the topbar/sidebar to the main content.
 *
 * Mount it as the FIRST element inside <body>. Target the main content
 * landmark with id="main-content" and tabIndex={-1}.
 */
export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ targetId = "main-content", className, children = "본문으로 건너뛰기", ...props }, ref) => (
    <a
      ref={ref}
      href={`#${targetId}`}
      lang="ko"
      className={cn(
        "sr-only focus-visible:not-sr-only",
        "focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[var(--z-tooltip)]",
        "focus-visible:px-[var(--pad-lg)] focus-visible:py-[var(--pad-sm)]",
        "focus-visible:bg-[var(--color-action-primary)] focus-visible:text-[var(--color-action-primary-fg)]",
        "focus-visible:font-medium focus-visible:text-[length:var(--text-sm)]",
        "focus-visible:rounded-[var(--radius-md)] focus-visible:shadow-[var(--shadow-lg)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--focus-ring-color)]",
        className
      )}
      style={{ letterSpacing: "-0.011em" }}
      {...props}
    >
      {children}
    </a>
  )
);
SkipLink.displayName = "SkipLink";
