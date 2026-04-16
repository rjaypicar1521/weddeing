import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function Tabs({ value, onValueChange, className, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)} {...props} />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex w-full gap-2 overflow-x-auto rounded-lg bg-neutral-100 p-1', className)} {...props} />;
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }

  const active = context.value === value;

  return (
    <button
      type='button'
      data-active={active ? 'true' : 'false'}
      className={cn(
        'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900',
        className,
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  );
}
