import * as React from 'react';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
      return;
    }

    setUncontrolledOpen(next);
  };

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error('DialogTrigger must be used within Dialog');
  }

  return (
    <button
      type='button'
      className={cn(className)}
      onClick={() => context.setOpen(true)}
      {...props}
    />
  );
}

export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext);

  if (!context || !context.open) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/45' onClick={() => context.setOpen(false)} />
      <div className='absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl'>
        <div className={cn(className)}>{children}</div>
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 space-y-1', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-neutral-600', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex items-center justify-end gap-2', className)} {...props} />;
}

export function DialogClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error('DialogClose must be used within Dialog');
  }

  return (
    <button
      type='button'
      className={cn(className)}
      onClick={() => context.setOpen(false)}
      {...props}
    />
  );
}

