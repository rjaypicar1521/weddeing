'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Reusable animated wrapper for invitation sections with reduced-motion fallback.
 */
export function SectionMotion({
  index,
  id,
  className,
  railClassName,
  children,
}: {
  index: number;
  id?: string;
  className?: string;
  railClassName?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const variants = [
    { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 } },
    { initial: { opacity: 0, x: -36 }, animate: { opacity: 1, x: 0 } },
    { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 } },
  ];
  const variant = variants[index % variants.length];
  const backdropPattern = index % 2 === 0 ? 'habibi-muted-section' : 'bg-white';

  return (
    <motion.section
      id={id}
      initial={reduceMotion ? false : variant.initial}
      whileInView={reduceMotion ? undefined : variant.animate}
      viewport={{ once: true, amount: 0.22 }}
      transition={reduceMotion ? undefined : { duration: 0.55, ease: 'easeOut', delay: Math.min(index * 0.04, 0.2) }}
      className={`gpu-transform w-full scroll-mt-24 py-10 sm:scroll-mt-28 sm:py-14 lg:py-[5.6rem] ${backdropPattern} ${className ?? ''}`}
    >
      <div className={`mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:max-w-[1240px] lg:px-10 ${railClassName ?? ''}`}>
        {children}
      </div>
    </motion.section>
  );
}
