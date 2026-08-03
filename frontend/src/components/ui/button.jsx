import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pe-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#6D49FF] via-[#7C4DFF] to-[#5F3DFF] text-white shadow-[0_8px_24px_-8px_rgba(124,77,255,.6)] hover:-translate-y-px hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-white/10 bg-white/[0.02] text-pe-text shadow-sm hover:border-white/20 hover:bg-white/[0.055]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "text-pe-muted hover:bg-white/[0.055] hover:text-pe-text",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-pe-control px-5",
        sm: "h-pe-control-sm rounded-pe-sm px-3.5 text-xs",
        lg: "h-pe-control-lg rounded-pe-md px-7 text-base",
        icon: "h-pe-icon w-pe-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
