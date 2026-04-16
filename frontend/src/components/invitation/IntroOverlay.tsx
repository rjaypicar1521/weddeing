'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { safeCssUrl } from '@/lib/security-utils';

function IntroWaveform({ active }: { active: boolean }) {
  return (
    <span className='inline-flex h-4 items-end gap-[2px]' aria-hidden='true'>
      {[0, 1, 2, 3].map((bar) => (
        <span key={bar} className={`w-[3px] rounded-sm bg-current ${active ? 'animate-pulse' : ''}`} style={{ height: `${6 + bar * 2}px`, animationDelay: `${bar * 120}ms` }} />
      ))}
    </span>
  );
}

/**
 * Full-screen cinematic intro shown once per guest session.
 */
export function IntroOverlay({
  showIntro,
  heroUrl,
  introStyleClass,
  names,
  weddingDateText,
  isMuted,
  onSkip,
  onToggleMusic,
}: {
  showIntro: boolean;
  heroUrl: string | null;
  introStyleClass: string;
  names: string;
  weddingDateText: string;
  isMuted: boolean;
  onSkip: () => void;
  onToggleMusic: () => void;
}) {
  useLockBodyScroll(showIntro);
  if (!showIntro) return null;

  return (
    <motion.section
      key='cinematic-intro'
      role='dialog'
      aria-modal='true'
      aria-label='Wedding invitation intro'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65 }}
      className={`fixed inset-0 z-50 overflow-hidden text-white ${introStyleClass}`}
    >
      {heroUrl ? <div className='absolute inset-0 scale-105 bg-cover bg-center blur-md' style={{ backgroundImage: safeCssUrl(heroUrl) ?? undefined }} aria-hidden='true' /> : <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,207,232,0.22),transparent_45%),linear-gradient(145deg,#111827,#1f2937)]' />}
      <div className='absolute inset-0 bg-black/60' />
      <div className='relative z-10 flex h-full flex-col px-4 pb-8 pt-4 sm:px-8'>
        <div className='flex items-start justify-end'>
          <Button type='button' variant='outline' className='border-white/40 bg-black/30 text-white hover:bg-white/10' onClick={onSkip} autoFocus aria-label='Skip intro'>Skip</Button>
        </div>
        <div className='flex flex-1 items-center justify-center text-center'>
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className='space-y-3'>
            <h1 className='text-balance text-4xl font-semibold leading-tight sm:text-6xl'>{names}</h1>
            <p className='text-sm uppercase tracking-[0.28em] text-neutral-200 sm:text-base'>{weddingDateText}</p>
          </motion.div>
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }} className='text-center text-sm text-neutral-200'>Scroll to explore</motion.p>
        <Button type='button' variant='outline' className='fixed bottom-4 right-4 z-[60] h-10 w-10 border-white/40 bg-black/30 text-white hover:bg-white/10 sm:bottom-auto sm:right-auto sm:self-end' onClick={onToggleMusic} aria-label={isMuted ? 'Unmute ambient music' : 'Mute ambient music'}><IntroWaveform active={!isMuted} /></Button>
      </div>
    </motion.section>
  );
}

