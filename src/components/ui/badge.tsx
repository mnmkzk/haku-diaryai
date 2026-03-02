import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                // Emotion variants
                joy: "border-transparent bg-emotion-joy/20 text-emotion-joy shadow-[0_0_8px_var(--emotion-joy)]/30",
                calm: "border-transparent bg-emotion-calm/20 text-emotion-calm shadow-[0_0_8px_var(--emotion-calm)]/30",
                sad: "border-transparent bg-emotion-sad/20 text-emotion-sad shadow-[0_0_8px_var(--emotion-sad)]/30",
                anger: "border-transparent bg-emotion-anger/20 text-emotion-anger shadow-[0_0_8px_var(--emotion-anger)]/30",
                anxiety: "border-transparent bg-emotion-anxiety/20 text-emotion-anxiety shadow-[0_0_8px_var(--emotion-anxiety)]/30",
                gratitude: "border-transparent bg-emotion-gratitude/20 text-emotion-gratitude shadow-[0_0_8px_var(--emotion-gratitude)]/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
