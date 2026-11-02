import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Composant shadcn/ui (Radix) adapté à la maquette : fond assombri, carte 6 px, titre condensé.
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(28,25,23,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-[rgba(0,0,0,0.65)]" />
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-6 pt-16 sm:pt-24">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'pointer-events-auto flex w-full max-w-[620px] flex-col gap-4 rounded-card border border-line bg-surface p-6 text-ink shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('titre m-0 text-[26px] leading-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('m-0 leading-normal', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap justify-end gap-2.5', className)} {...props} />;
}
