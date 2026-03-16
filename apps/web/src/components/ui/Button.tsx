import * as React from "react";
import { cn } from "../../utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, asChild, ...props }, ref) => {
    const canUseChildElement = Boolean(
      asChild &&
      React.Children.count(children) === 1 &&
      React.isValidElement(children) &&
      children.type !== React.Fragment &&
      !isLoading
    );
    const disabled = Boolean(isLoading || props.disabled);

    const baseStyles =
      "inline-flex items-center justify-center rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary: "bg-ink-strong text-white shadow-[0_18px_34px_rgba(15,23,42,0.16)] hover:opacity-95",
      secondary: "bg-surface-2 text-text-primary hover:bg-white",
      outline: "border border-border-subtle bg-white/90 text-text-primary hover:bg-surface-2",
      ghost: "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      danger: "bg-rose-600 text-white shadow-[0_18px_34px_rgba(225,29,72,0.16)] hover:bg-rose-700",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-6 text-sm",
      icon: "h-10 w-10",
    };

    if (canUseChildElement) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      const childClassName = typeof child.props.className === "string" ? child.props.className : undefined;
      const childOnClick =
        typeof child.props.onClick === "function"
          ? (child.props.onClick as React.MouseEventHandler<HTMLElement>)
          : undefined;
      const ownOnClick = props.onClick as React.MouseEventHandler<HTMLElement> | undefined;

      return React.cloneElement(child, {
        className: cn(baseStyles, variants[variant], sizes[size], className, childClassName),
        "aria-disabled": disabled || undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          childOnClick?.(event);
          ownOnClick?.(event);
        }
      });
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {isLoading ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
