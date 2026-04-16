'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { resolveAssetUrl } from '@/lib/asset-utils';
import type { GiftMethod } from '@/lib/types';
import { SectionHeading } from '@/components/invitation/SectionHeading';

/**
 * Gift channels section including QR and account details.
 */
export function GiftGuideSection({ giftMethods }: { giftMethods: GiftMethod[] }) {
  return (
    <Card className='habibi-panel'>
      <CardContent className='space-y-7 px-5 py-7 sm:px-7 md:px-9 lg:px-12'>
        <SectionHeading
          eyebrow='Gift Guide'
          title='Cash Gift / QR Codes'
          description="If you'd like to bless the couple, their preferred gift methods are listed below for convenience."
        />
        {giftMethods.length === 0 ? (
          <p className='border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] px-4 py-6 text-sm text-[color:var(--brand-muted-text)]'>
            Gift details are not available yet. Please check back later.
          </p>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2'>
            {giftMethods.map((method, index) => {
              const qrUrl = resolveAssetUrl(method.qr_path) ?? '';
              return (
                <Card key={`${method.label}-${index}`} className='border-[color:var(--brand-border)] bg-white'>
                  <CardContent className='space-y-4 p-5'>
                    <p className='habibi-script text-[2rem] leading-none text-[color:var(--brand-ink)]'>
                      {method.label ?? 'Gift Method'}
                    </p>
                    {qrUrl ? (
                      <Image
                        src={qrUrl}
                        alt={`${method.label ?? 'Gift'} QR`}
                        width={320}
                        height={320}
                        className='h-44 w-full border border-[color:var(--brand-border)] bg-white p-3 object-contain grayscale'
                      />
                    ) : (
                      <div className='flex h-44 items-center justify-center border border-[color:var(--brand-border)] bg-[color:var(--brand-surface)] text-sm text-[color:var(--brand-muted-text)]'>
                        QR code not uploaded
                      </div>
                    )}
                    <div className='space-y-2 text-sm leading-7 text-[color:var(--brand-ink)]'>
                      <p>Account Name: {method.account_name ?? '-'}</p>
                      <p>Account Number: {method.account_number ?? '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
