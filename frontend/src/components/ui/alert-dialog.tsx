import * as React from 'react';
import { cn } from '@/lib/utils';

type AlertDialogProps = React.HTMLAttributes<HTMLDivElement>;
type AlertDialogTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type AlertDialogContentProps = React.HTMLAttributes<HTMLDivElement>;
type AlertDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;
type AlertDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;
type AlertDialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
type AlertDialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;
type AlertDialogActionProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type AlertDialogCancelProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function AlertDialog({ className, ...props }: AlertDialogProps) {
  return <div className={cn(className)} {...props} />;
}

function AlertDialogTrigger({ className, ...props }: AlertDialogTriggerProps) {
  return <button className={cn(className)} {...props} />;
}

function AlertDialogContent({ className, ...props }: AlertDialogContentProps) {
  return <div className={cn('rounded-lg border border-neutral-200 bg-white p-4 shadow-sm', className)} {...props} />;
}

function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return <div className={cn('space-y-1', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return <div className={cn('mt-4 flex items-center gap-2', className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return <h3 className={cn('text-base font-semibold', className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return <p className={cn('text-sm text-neutral-600', className)} {...props} />;
}

function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
  return (
    <button
      className={cn('rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800', className)}
      {...props}
    />
  );
}

function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  return (
    <button
      className={cn('rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50', className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
