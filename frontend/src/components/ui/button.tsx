import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-11 min-w-11 px-4",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden bg-gradient-to-br from-[#5a3cb8] via-primary to-[#8b6ae6] text-primary-foreground shadow-[0_0_36px_-10px_rgba(104,74,188,0.85)] hover:brightness-110 hover:shadow-[0_0_44px_-6px_rgba(10,238,235,0.35)] active:scale-[0.98]",
        secondary:
          "border border-accent/25 bg-surface/90 text-foreground shadow-none hover:border-accent/50 hover:bg-surface hover:shadow-[0_0_28px_-10px_rgba(10,238,235,0.22)]",
        ghost: "text-foreground hover:bg-accent/[0.07] hover:text-accent",
        link: "text-accent underline-offset-4 hover:underline min-h-11 min-w-auto px-2 font-medium",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded-lg px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11 shrink-0 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
