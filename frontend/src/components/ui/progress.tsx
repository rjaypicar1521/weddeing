import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-200', className)}>
      <div
        className={cn('h-full rounded-full bg-neutral-900 transition-all', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

