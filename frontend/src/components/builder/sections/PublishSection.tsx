"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Confetti from 'react-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { getInvitation, previewInvitation, publishInvitation } from '@/lib/invitation';
import { safeExternalOpen } from '@/lib/security-utils';
import { BuilderSectionsDraft } from '@/types/builder';

interface PublishSectionProps {
  sections: BuilderSectionsDraft;
  onCompletionChange: (complete: boolean) => void;
}

function buildInvitationUrl(slug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${appUrl.replace(/\/+$/, '')}/i/${slug}`;
}

function CheckCircle({ complete }: { complete: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
        complete ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
      }`}
      aria-hidden='true'
    >
      {complete ? 'OK' : '!'}
    </span>
  );
}

export function PublishSection({ sections, onCompletionChange }: PublishSectionProps) {
  const queryClient = useQueryClient();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [republishDialogOpen, setRepublishDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const invitationQuery = useQuery({
    queryKey: ['invitation'],
    queryFn: getInvitation,
  });

  const previewMutation = useMutation({
    mutationFn: previewInvitation,
    onSuccess: () => {
      safeExternalOpen('/dashboard/builder/preview');
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load preview right now.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishInvitation,
    onSuccess: (response) => {
      setPublishDialogOpen(false);
      setRepublishDialogOpen(false);
      setShowConfetti(true);
      setToastMessage(invitationQuery.data?.invitation?.status === 'published' ? 'Invitation re-published successfully.' : 'Invitation published successfully.');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['invitation'] });
      if (response.invitation?.status === 'published') {
        onCompletionChange(true);
      }
    },
    onError: (error: unknown) => {
      setPublishDialogOpen(false);
      setRepublishDialogOpen(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish invitation.');
    },
  });

  useEffect(() => {
    const status = invitationQuery.data?.invitation?.status;
    onCompletionChange(status === 'published');
  }, [invitationQuery.data?.invitation?.status, onCompletionChange]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!showConfetti) {
      return;
    }

    const timer = window.setTimeout(() => setShowConfetti(false), 5500);
    return () => window.clearTimeout(timer);
  }, [showConfetti]);

  const invitation = invitationQuery.data?.invitation;
  const slug = invitation?.slug ?? '';
  const guestCode = invitation?.guest_code ?? '';
  const invitationUrl = useMemo(() => (slug ? buildInvitationUrl(slug) : ''), [slug]);
  const isPublished = invitation?.status === 'published';

  const checklist = [
    { label: 'Wedding Details', complete: sections['wedding-details']?.complete ?? false },
    { label: 'Template Selected', complete: sections['theme-design']?.complete ?? false },
    { label: 'Hero Photo Uploaded', complete: sections.media?.complete ?? false },
    { label: 'Guest Code Generated', complete: guestCode.trim().length === 6 },
  ];
  const canPublish = checklist.every((item) => item.complete);

  const whatsappLink = invitationUrl ? `https://wa.me/?text=${encodeURIComponent(invitationUrl)}` : '#';
  const messengerLink = invitationUrl ? `fb-messenger://share/?link=${encodeURIComponent(invitationUrl)}` : '#';
  const emailLink = invitationUrl
    ? `mailto:?subject=${encodeURIComponent('Wedding Invitation')}&body=${encodeURIComponent(invitationUrl)}`
    : '#';

  return (
    <div className='space-y-4'>
      {showConfetti && viewport.width > 0 && viewport.height > 0 ? (
        <Confetti width={viewport.width} height={viewport.height} recycle={false} numberOfPieces={300} />
      ) : null}

      {toastMessage ? (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{toastMessage}</AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant='destructive'>
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Publish</CardTitle>
          <CardDescription>Finalize your invitation, preview before sharing, then publish.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='flex items-center gap-3'>
            <p className='text-sm font-medium'>Status</p>
            <Badge>{isPublished ? 'Published' : 'Draft'}</Badge>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Pre-publish Checklist</p>
            <ul className='space-y-2'>
              {checklist.map((item) => (
                <li key={item.label} className='flex items-center gap-2 text-sm text-neutral-700'>
                  <CheckCircle complete={item.complete} />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Loading Preview...' : 'Preview'}
            </Button>

            {!isPublished ? (
              <Button type='button' disabled={!canPublish || publishMutation.isPending} onClick={() => setPublishDialogOpen(true)}>
                Publish Invitation
              </Button>
            ) : (
              <Button
                type='button'
                variant='outline'
                className='border-amber-500 text-amber-700 hover:bg-amber-50'
                disabled={publishMutation.isPending}
                onClick={() => setRepublishDialogOpen(true)}
              >
                Re-publish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isPublished ? (
        <Card>
          <CardHeader>
            <CardTitle>Share Published Invitation</CardTitle>
            <CardDescription>Your invitation is now live and ready to share.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm font-medium'>Full URL</p>
              <div className='flex flex-wrap items-center gap-2'>
                <p className='max-w-full break-all text-sm text-neutral-700'>{invitationUrl}</p>
                <CopyButton text={invitationUrl} label='Copy URL' />
              </div>
            </div>

            <div className='inline-flex rounded-lg border border-neutral-200 bg-white p-3'>
              <QRCodeSVG value={invitationUrl} size={128} />
            </div>

            <div className='flex flex-wrap gap-2'>
              <a
                href={whatsappLink}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50'
              >
                WhatsApp
              </a>
              <a
                href={messengerLink}
                className='inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50'
              >
                Messenger
              </a>
              <a
                href={emailLink}
                className='inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50'
              >
                Email
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {publishDialogOpen ? (
        <AlertDialog>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish invitation now?</AlertDialogTitle>
              <AlertDialogDescription>
                Your invitation will become shareable to guests using your URL and guest code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPublishDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !canPublish}>
                {publishMutation.isPending ? 'Publishing...' : 'Confirm Publish'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {republishDialogOpen ? (
        <AlertDialog>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-publish invitation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will refresh the live invitation so guests see the latest published version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRepublishDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                {publishMutation.isPending ? 'Re-publishing...' : 'Confirm Re-publish'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
