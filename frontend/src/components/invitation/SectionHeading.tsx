'use client';

/**
 * Standardized section heading block used across invitation sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={`space-y-4 ${align === 'center' ? 'text-center' : ''}`}>
      <p className='habibi-script text-[1.5rem] leading-none text-[color:var(--brand-accent)] sm:text-[1.7rem]'>{eyebrow}</p>
      <div className='space-y-3'>
        <h2 className='habibi-script text-pretty text-[2.3rem] leading-[1.03] text-[color:var(--brand-ink)] sm:text-[3rem] lg:text-[3.4rem]'>{title}</h2>
        <p className={`text-sm leading-7 text-[color:var(--brand-body)] sm:text-[15px] lg:text-base ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{description}</p>
      </div>
    </div>
  );
}
