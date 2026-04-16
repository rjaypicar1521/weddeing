import * as React from 'react';
import { cn } from '@/lib/utils';

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

type SheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Sheet({ open: controlledOpen, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
      return;
    }

    setUncontrolledOpen(next);
  };

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error('SheetTrigger must be used within Sheet');
  }

  return (
    <button
      type='button'
      className={cn('rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium', className)}
      onClick={() => context.setOpen(true)}
      {...props}
    />
  );
}

export function SheetContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(SheetContext);

  if (!context || !context.open) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/40' onClick={() => context.setOpen(false)} />
      <div className={cn('absolute right-0 top-0 h-full w-80 bg-white p-4 shadow-xl', className)}>{children}</div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 border-b border-neutral-200 pb-3', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function SheetClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error('SheetClose must be used within Sheet');
  }

  return (
    <button
      type='button'
      className={cn('rounded-md border border-neutral-300 px-3 py-1.5 text-sm', className)}
      onClick={() => context.setOpen(false)}
      {...props}
    />
  );
}
