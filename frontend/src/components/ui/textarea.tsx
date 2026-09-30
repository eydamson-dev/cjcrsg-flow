import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }