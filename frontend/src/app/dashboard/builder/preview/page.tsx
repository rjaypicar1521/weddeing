"use client";

import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { previewInvitation } from '@/lib/invitation';

export default function InvitationPreviewPage() {
  const previewQuery = useQuery({
    queryKey: ['invitation-preview'],
    queryFn: previewInvitation,
  });

  if (previewQuery.isLoading) {
    return <main className='mx-auto max-w-5xl p-6 text-sm text-neutral-600'>Loading preview...</main>;
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <main className='mx-auto max-w-5xl p-6'>
        <Alert variant='destructive'>
          <AlertTitle>Preview unavailable</AlertTitle>
          <AlertDescription>Unable to load invitation preview right now.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const { invitation, love_story_chapters, entourage_members, media, preview_mode } = previewQuery.data;
  const partner1Name = String(invitation.partner1_name ?? 'Partner 1');
  const partner2Name = String(invitation.partner2_name ?? 'Partner 2');
  const venueName = String(invitation.venue_name ?? 'Not set');
  const weddingDate = String(invitation.wedding_date ?? 'Not set');

  return (
    <main className='mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6'>
      <div className='sticky top-2 z-20 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800'>
        PREVIEW MODE -- Not yet shared
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {partner1Name} &amp; {partner2Name}
          </CardTitle>
          <CardDescription>Live guest-facing preview payload from /api/v1/invitation/preview</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2 text-sm text-neutral-700'>
          <p>Status: <Badge>{invitation.status}</Badge></p>
          <p>Venue: {venueName}</p>
          <p>Date: {weddingDate}</p>
          <p>Preview Mode: {preview_mode ? 'true' : 'false'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media Summary</CardTitle>
        </CardHeader>
        <CardContent className='text-sm'>
          <ul className='space-y-1'>
            <li>Hero: {(media.hero ?? []).length}</li>
            <li>Gallery: {(media.gallery ?? []).length}</li>
            <li>Chapter: {(media.chapter ?? []).length}</li>
            <li>Entourage: {(media.entourage ?? []).length}</li>
            <li>QR: {(media.qr_code ?? []).length}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Love Story Chapters</CardTitle>
        </CardHeader>
        <CardContent className='text-sm'>
          {(love_story_chapters ?? []).length === 0 ? (
            <p className='text-neutral-600'>No chapters yet.</p>
          ) : (
            <ol className='space-y-2'>
              {love_story_chapters.map((chapter) => (
                <li key={chapter.id}>
                  <span className='font-medium'>{chapter.title}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entourage Members</CardTitle>
        </CardHeader>
        <CardContent className='text-sm'>
          {(entourage_members ?? []).length === 0 ? (
            <p className='text-neutral-600'>No entourage members yet.</p>
          ) : (
            <ul className='space-y-1'>
              {entourage_members.map((member) => (
                <li key={member.id}>
                  {member.name} ({member.role})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
