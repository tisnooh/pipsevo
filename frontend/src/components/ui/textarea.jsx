import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full resize-y rounded-pe-md border border-white/10 bg-[#0D1020] px-4 py-3 text-base text-pe-text shadow-sm placeholder:text-pe-subtle hover:border-white/[0.16] focus-visible:border-[#8B63FF] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
