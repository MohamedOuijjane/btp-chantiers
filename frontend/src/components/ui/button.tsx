import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Composant shadcn/ui adapté à la maquette : rayon 4 px, cible ≥ 44 px.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-on hover:brightness-95',
        outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
        ghost: 'bg-transparent text-ink hover:bg-surface-2',
        link: 'text-accent-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-cible px-4',
        sm: 'min-h-cible px-3 text-sm',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
