'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function FlipDigit({ value }: { value: string }) {
  return (
    <div className='relative h-12 w-8 overflow-hidden border border-[color:var(--brand-border)] bg-[color:var(--brand-ink)] text-center text-2xl font-semibold text-white sm:h-14 sm:w-10 sm:text-3xl'>
      <AnimatePresence mode='wait'>
        <motion.span key={value} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.28 }} className='absolute inset-0 flex items-center justify-center'>
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/**
 * Live countdown renderer for the wedding date.
 */
export function CountdownTimer({ weddingDate }: { weddingDate: string | undefined }) {
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = useMemo(() => {
    if (!weddingDate) return null;
    const parsed = new Date(weddingDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime();
  }, [weddingDate]);

  if (!target) return <p className='text-sm text-[color:var(--brand-muted-text)]'>Countdown starts once wedding date is set.</p>;
  const diff = Math.max(0, target - now);
  if (diff <= 0) return <div className='border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-2xl font-semibold text-emerald-800'>Wedding Day!</div>;

  const totalSeconds = Math.floor(diff / 1000);
  const units = [
    { label: 'Days', value: String(Math.floor(totalSeconds / 86400)).padStart(2, '0') },
    { label: 'Hours', value: String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0') },
    { label: 'Mins', value: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0') },
    { label: 'Secs', value: String(totalSeconds % 60).padStart(2, '0') },
  ];

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
      {units.map((unit) => (
        <Card key={unit.label} className='border-[color:var(--brand-border)] bg-white'>
          <CardContent className='space-y-2 px-3 py-4 text-center'>
            <div className='flex justify-center gap-1'>{unit.value.split('').map((digit, i) => (reduceMotion ? <div key={`${unit.label}-${i}-${digit}`} className='relative h-12 w-8 overflow-hidden border border-[color:var(--brand-border)] bg-[color:var(--brand-ink)] text-center text-2xl font-semibold text-white sm:h-14 sm:w-10 sm:text-3xl'>{digit}</div> : <FlipDigit key={`${unit.label}-${i}-${digit}`} value={digit} />))}</div>
            <p className='text-xs uppercase tracking-[0.2em] text-[color:var(--brand-muted-text)]'>{unit.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
