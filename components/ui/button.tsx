import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Boutons Tamurt Transport : les boutons pleins ont la silhouette « flèche » (.btn-fleche, app/globals.css),
 * la pointe à droite donne le sens du voyage. Les boutons de contour, discrets et liens restent droits.
 * La pointe prend 14 px : le texte garde un padding plus large à droite pour rester centré dans le corps.
 */
const fleche = ["default", "secondary", "inverse", "destructive"] as const;

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold transition-[background-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default: "btn-fleche rounded-r-none text-primary-foreground [--fleche-bg:var(--primary)] hover:[--fleche-bg:var(--primary-hover)]",
        secondary: "btn-fleche rounded-r-none text-primary-soft-foreground [--fleche-bg:var(--primary-soft)] hover:[--fleche-bg:color-mix(in_srgb,var(--primary-soft),var(--primary)_12%)]",
        /** Sur un fond de marque (bandeau sarcelle) : aplat blanc, texte sarcelle profond. */
        inverse: "btn-fleche rounded-r-none text-brand-deep [--fleche-bg:var(--brand-on)] hover:[--fleche-bg:#ebebeb]",
        destructive: "btn-fleche rounded-r-none text-destructive-foreground [--fleche-bg:var(--destructive)] hover:[--fleche-bg:color-mix(in_srgb,var(--destructive),black_9%)]",
        outline: "border border-input bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-lg",
        icon: "size-10 btn-carre",
      },
    },
    compoundVariants: [
      { variant: [...fleche], size: "default", class: "pr-[26px]" },
      { variant: [...fleche], size: "sm", class: "pr-[22px]" },
      { variant: [...fleche], size: "lg", class: "pr-[34px]" },
      { variant: [...fleche], size: "icon", class: "rounded-lg" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? children : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
