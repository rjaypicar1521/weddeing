"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { resendVerificationEmail, verifyEmail } from '@/lib/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'already' | 'error'>('idle');
  const [message, setMessage] = useState('Check your inbox for your verification link.');

  const payload = useMemo(
    () => ({
      id: searchParams.get('id'),
      hash: searchParams.get('hash'),
      expires: searchParams.get('expires'),
      signature: searchParams.get('signature'),
    }),
    [searchParams],
  );

  useEffect(() => {
    async function verifyFromLink() {
      if (!payload.id || !payload.hash || !payload.expires || !payload.signature) {
        return;
      }

      setStatus('verifying');

      try {
        await verifyEmail({
          id: payload.id,
          hash: payload.hash,
          expires: payload.expires,
          signature: payload.signature,
        });

        setStatus('verified');
        setMessage('Email verified successfully. Redirecting to dashboard...');

        setTimeout(() => {
          router.replace('/dashboard?verified=1');
        }, 900);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          if (error.message.toLowerCase().includes('already')) {
            setStatus('already');
            setMessage('Your email is already verified.');
            return;
          }
        }

        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed.');
      }
    }

    void verifyFromLink();
  }, [payload, router]);

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (result) => {
      setStatus('idle');
      setMessage(result.message ?? 'Verification email resent. Check your inbox.');
    },
    onError: (error: unknown) => {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to resend verification email.');
    },
  });

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Check your inbox and click the verification link to continue.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {status === 'verified' ? (
            <Alert variant='success'>
              <AlertTitle>Verified</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'already' ? (
            <Alert variant='default'>
              <AlertTitle>Already verified</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'error' ? (
            <Alert variant='destructive'>
              <AlertTitle>Verification issue</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'idle' || status === 'verifying' ? (
            <Alert>
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type='button'
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || status === 'verifying'}
            className='w-full'
          >
            {resendMutation.isPending ? 'Resending...' : 'Resend verification email'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<main className='mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12 text-sm text-neutral-600'>Loading verification...</main>}>
        <VerifyEmailScreen />
      </Suspense>
    </QueryClientProvider>
  );
}
