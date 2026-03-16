import * as React from "react";
import { cn } from "../../utils/cn";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

const alertVariants = {
    default: "bg-surface-2 text-text-primary border-border-subtle",
    destructive: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
    warning: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
    success: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10",
};

const icons = {
    default: Info,
    destructive: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: keyof typeof alertVariants;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        const Icon = icons[variant];
        return (
            <div
                ref={ref}
                role="alert"
                className={cn(
                    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current",
                    alertVariants[variant],
                    className
                )}
                {...props}
            >
                <Icon className="h-4 w-4" />
                {children}
            </div>
        );
    }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h5
            ref={ref}
            className={cn("mb-1 font-medium leading-none tracking-tight", className)}
            {...props}
        />
    )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("text-sm opacity-90", className)}
            {...props}
        />
    )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
