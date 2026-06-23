import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full py-[7px] px-[12px] text-2xs font-bold leading-none whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        brand: "bg-pullim-blue-600 text-white",
        info: "bg-pullim-blue-50 text-pullim-blue-700",
        neutral: "bg-pullim-slate-100 text-pullim-slate-600",
        outline: "border border-pullim-slate-200 text-pullim-slate-600",
        danger: "bg-pullim-danger/10 text-pullim-danger",
        lemon: "bg-pullim-lemon-soft text-pullim-lemon-ink",
        invert: "bg-white/15 text-white",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

export type ChipProps = React.ComponentProps<"span"> &
  VariantProps<typeof chipVariants>

function Chip({ className, tone, ...props }: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(chipVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Chip, chipVariants }
