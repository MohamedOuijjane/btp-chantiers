import { cn } from '@/lib/utils';

/** Bloc gris animé affiché pendant un chargement (composant shadcn/ui). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-btn bg-track', className)}
      {...props}
    />
  );
}
