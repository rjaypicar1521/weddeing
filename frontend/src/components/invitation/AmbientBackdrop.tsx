'use client';

import { motion } from 'framer-motion';
import { hexToRgba } from '@/lib/color-utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Visual ambient background layer for invitation pages.
 */
export function AmbientBackdrop({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
      <div
        className='absolute inset-0'
        style={{
          backgroundImage: 'linear-gradient(180deg, #FFF9F2 0%, #FDF6EE 34%, #F7EFE5 68%, #F4EAE0 100%)',
        }}
      />
      <motion.div
        className='absolute inset-x-0 top-0 h-[48rem]'
        style={{
          backgroundImage: `radial-gradient(circle_at_14%_16%, ${hexToRgba(primaryColor, 0.22)}, transparent 36%), radial-gradient(circle_at_84%_12%, ${hexToRgba(accentColor, 0.24)}, transparent 36%), radial-gradient(circle_at_center, rgba(255,255,255,0.9), transparent 58%)`,
        }}
        animate={reduceMotion ? undefined : { opacity: [0.82, 1, 0.86], scale: [1, 1.015, 0.995] }}
        transition={reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className='absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(88,55,43,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(88,55,43,0.08)_1px,transparent_1px)] [background-size:120px_120px] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.5),transparent_80%)]' />
      <motion.div
        className='absolute -left-20 top-[26rem] h-[20rem] w-[20rem] rounded-full border'
        style={{ borderColor: hexToRgba(primaryColor, 0.2) }}
        animate={reduceMotion ? undefined : { x: [0, 12, -8, 0], y: [0, -16, 10, 0] }}
        transition={reduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className='absolute -right-24 top-[42rem] h-[22rem] w-[22rem] rounded-full border'
        style={{ borderColor: hexToRgba(accentColor, 0.22) }}
        animate={reduceMotion ? undefined : { x: [0, -14, 10, 0], y: [0, 14, -10, 0] }}
        transition={reduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

