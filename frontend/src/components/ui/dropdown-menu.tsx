import * as React from 'react';
import { cn } from '@/lib/utils';

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className='relative inline-flex'>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
  asChild?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  }

  const child = React.Children.only(children) as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
  const props = {
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event);
      context.setOpen(!context.open);
    },
    'aria-expanded': context.open,
    'aria-haspopup': 'menu',
  };

  if (asChild) {
    return React.cloneElement(child, props);
  }

  return React.cloneElement(child, props);
}

export function DropdownMenuContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  if (!context) {
    throw new Error('DropdownMenuContent must be used within DropdownMenu');
  }

  React.useEffect(() => {
    if (!context.open) return;

    const listener = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (contentRef.current && target && !contentRef.current.contains(target)) {
        context.setOpen(false);
      }
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [context]);

  if (!context.open) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      role='menu'
      className={cn('absolute right-0 top-full z-50 mt-2 min-w-44 rounded-md border bg-white p-1 shadow-lg', className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuItem must be used within DropdownMenu');
  }

  return (
    <button
      type='button'
      role='menuitem'
      className={cn(
        'w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        context.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
