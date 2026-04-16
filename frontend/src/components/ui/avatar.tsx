import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  fallback: string;
}

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-700',
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className='h-full w-full object-cover' />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
