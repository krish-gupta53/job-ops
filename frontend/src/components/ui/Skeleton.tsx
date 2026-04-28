import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function JobCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
