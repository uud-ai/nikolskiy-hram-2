import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-wide transition-colors duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-pine text-paper hover:bg-pine-dim shadow-[0_8px_30px_-10px_rgba(63,91,71,0.6)]",
        gold:
          "bg-gold text-ink hover:bg-gold-dim shadow-[0_8px_30px_-10px_rgba(196,164,90,0.7)]",
        outline:
          "border border-ink/20 text-ink hover:border-gold hover:text-gold-dim bg-transparent",
        ghost: "text-ink hover:text-gold-dim bg-transparent",
      },
      size: {
        default: "h-12 px-7",
        sm: "h-10 px-5 text-sm",
        lg: "h-14 px-9 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)
