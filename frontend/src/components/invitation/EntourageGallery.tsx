'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { resolveAssetUrl } from '@/lib/asset-utils';
import type { EntourageItem } from '@/lib/types';
import { SectionHeading } from '@/components/invitation/SectionHeading';

function roleToLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Entourage roster grouped by role categories.
 */
export function EntourageGallery({
  groups,
}: {
  groups: Array<{ label: string; members: EntourageItem[] }>;
}) {
  return (
    <Card className='habibi-panel'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Wedding Party'
          title='Entourage Gallery'
          description='Meet the people walking with the couple through one of the most meaningful days of their lives.'
        />
        {groups.length === 0 ? (
          <p className='border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>
            Entourage details are not available yet. Please check back later.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className='space-y-4'>
              <h3 className='habibi-script text-[2rem] leading-none text-[color:var(--brand-ink)]'>
                {group.label}
              </h3>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                {group.members.map((member) => {
                  const photoUrl = resolveAssetUrl(member.photo_path);
                  const initials = String(member.name ?? '?')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('');
                  const roleLabel = roleToLabel(String(member.role ?? 'entourage'));

                  return (
                    <Card key={member.id ?? `${member.name}-${member.role}`} className='overflow-hidden border-[color:var(--brand-border)] bg-white'>
                      <CardContent className='space-y-3 p-3 text-center'>
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt={`Photo of ${member.name ?? 'Entourage member'}, ${roleLabel}`}
                            width={240}
                            height={240}
                            className='h-32 w-full border border-[color:var(--brand-border)] object-cover grayscale'
                          />
                        ) : (
                          <div className='flex h-32 items-center justify-center border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] text-xl font-semibold text-[color:var(--brand-ink)]'>
                            {initials || '?'}
                          </div>
                        )}
                        <p className='text-lg font-medium leading-tight text-[color:var(--brand-ink)]'>
                          {member.name ?? 'Unnamed'}
                        </p>
                        <Badge className='border-[color:var(--brand-border)] bg-white text-[color:var(--brand-ink)]'>
                          {roleLabel}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
