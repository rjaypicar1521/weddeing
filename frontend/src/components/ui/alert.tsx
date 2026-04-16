import * as React from 'react';
import { cn } from '@/lib/utils';

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'destructive' | 'success';
};

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role='alert'
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'default' && 'border-neutral-200 bg-neutral-50 text-neutral-800',
        variant === 'destructive' && 'border-red-200 bg-red-50 text-red-800',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-semibold', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('leading-relaxed', className)} {...props} />;
}
