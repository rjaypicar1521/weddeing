import * as React from 'react';
import { cn } from '@/lib/utils';

type AccordionProps = React.HTMLAttributes<HTMLDivElement>;
type AccordionItemProps = React.DetailsHTMLAttributes<HTMLDetailsElement>;
type AccordionTriggerProps = React.HTMLAttributes<HTMLElement>;
type AccordionContentProps = React.HTMLAttributes<HTMLDivElement>;

function Accordion({ className, ...props }: AccordionProps) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

function AccordionItem({ className, ...props }: AccordionItemProps) {
  return <details className={cn('rounded-lg border border-neutral-200', className)} {...props} />;
}

function AccordionTrigger({ className, ...props }: AccordionTriggerProps) {
  return <summary className={cn('cursor-pointer list-none px-4 py-3 text-sm font-medium', className)} {...props} />;
}

function AccordionContent({ className, ...props }: AccordionContentProps) {
  return <div className={cn('border-t border-neutral-200 px-4 py-3', className)} {...props} />;
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
