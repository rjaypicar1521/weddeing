'use client';

import { use } from 'react';
import { InvitationView } from '@/components/invitation/InvitationView';
import { QueryProvider } from '@/components/providers/QueryProvider';

/**
 * Thin page shell for guest invitation view route.
 */
export default function InvitationViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <QueryProvider>
      <InvitationView slug={slug} />
    </QueryProvider>
  );
}
