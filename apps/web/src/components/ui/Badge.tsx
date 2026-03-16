import * as React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

    const variants = {
        default: "border-transparent bg-brand-500 text-white hover:bg-brand-600",
        secondary: "border-transparent bg-surface-2 text-text-secondary hover:bg-surface-2/80",
        outline: "text-text-primary border-border-subtle",
        destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
        success: "border-transparent bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
        warning: "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    };

    return (
        <div className={cn(baseClasses, variants[variant], className)} {...props} />
    );
}

export { Badge };
