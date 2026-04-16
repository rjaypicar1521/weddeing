"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { getInvitation, regenerateGuestCode } from '@/lib/invitation';

interface GuestAccessSectionProps {
  onCompletionChange: (complete: boolean) => void;
}

function buildInvitationUrl(slug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${appUrl.replace(/\/+$/, '')}/i/${slug}`;
}

export function GuestAccessSection({ onCompletionChange }: GuestAccessSectionProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invitationQuery = useQuery({
    queryKey: ['invitation'],
    queryFn: getInvitation,
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateGuestCode,
    onSuccess: (data) => {
      setToastMessage(`New guest code: ${data.guest_code} ✅`);
      setErrorMessage(null);
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['invitation'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to regenerate guest code.');
      setConfirmOpen(false);
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

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const invitation = invitationQuery.data?.invitation;
  const slug = invitation?.slug ?? '';
  const guestCode = invitation?.guest_code ?? '------';
  const invitationUrl = useMemo(() => (slug ? buildInvitationUrl(slug) : ''), [slug]);

  const whatsappLink = invitationUrl ? `https://wa.me/?text=${encodeURIComponent(invitationUrl)}` : '#';
  const messengerLink = invitationUrl ? `fb-messenger://share/?link=${encodeURIComponent(invitationUrl)}` : '#';
  const emailLink = invitationUrl
    ? `mailto:?subject=${encodeURIComponent('Wedding Invitation')}&body=${encodeURIComponent(invitationUrl)}`
    : '#';

  return (
    <div className='space-y-4'>
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
          <CardTitle>Guest Access</CardTitle>
          <CardDescription>Share code and invitation URL with your guests.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Guest Code</p>
            <div className='flex flex-wrap items-center gap-3'>
              <Badge className='px-4 py-2 text-2xl tracking-[0.2em]'>{guestCode}</Badge>
              <CopyButton
                text={guestCode}
                label='Copy code'
                onCopied={() => setToastMessage('Guest code copied to clipboard')}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Invitation URL</p>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='max-w-full break-all text-sm text-neutral-700'>{invitationUrl || 'Unavailable until slug exists'}</p>
              {invitationUrl ? (
                <CopyButton
                  text={invitationUrl}
                  label='Copy URL'
                  onCopied={() => setToastMessage('Invitation URL copied to clipboard')}
                />
              ) : null}
            </div>
            {invitationUrl ? (
              <div className='inline-flex rounded-lg border border-neutral-200 bg-white p-3'>
                <QRCodeSVG value={invitationUrl} size={128} />
              </div>
            ) : null}
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Regenerate Code</p>
            <Button
              type='button'
              variant='outline'
              className='border-amber-500 text-amber-700 hover:bg-amber-50'
              onClick={() => setConfirmOpen(true)}
              disabled={!invitation || regenerateMutation.isPending}
            >
              Regenerate Code
            </Button>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Share</p>
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
          </div>
        </CardContent>
      </Card>

      {confirmOpen ? (
        <AlertDialog>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate Guest Code?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new guest code. All guests with the old code will no longer have access.
              </AlertDialogDescription>
              <AlertDialogDescription>Current code: {guestCode}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  regenerateMutation.mutate();
                }}
                disabled={regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? 'Regenerating...' : 'Confirm Regenerate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
