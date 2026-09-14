"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      /*
       * sonner 기본 토스트 색(success=녹 · warning=앰버)을 풀림 팔레트로 덮어쓴다.
       * [08 § 1.3] success·warn 은 deprecated — 완료는 블루, 주의는 중립으로 간다.
       * 뜻은 색이 아니라 위 `icons` 의 **모양**(체크·삼각형·팔각형)과 문구가 말한다.
       */
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",

          "--success-bg": "var(--color-pullim-blue-50)",
          "--success-text": "var(--color-pullim-blue-700)",
          "--success-border": "var(--color-pullim-blue-200)",

          "--info-bg": "var(--color-pullim-blue-50)",
          "--info-text": "var(--color-pullim-blue-700)",
          "--info-border": "var(--color-pullim-blue-200)",

          "--warning-bg": "var(--color-pullim-slate-50)",
          "--warning-text": "var(--color-pullim-slate-900)",
          "--warning-border": "var(--color-pullim-slate-400)",

          "--error-bg": "var(--color-pullim-danger-bg)",
          "--error-text": "var(--color-pullim-danger)",
          "--error-border": "var(--color-pullim-danger)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
