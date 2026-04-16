"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useVerifyEmail } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { mutate: verify, isPending, isSuccess, isError, error } = useVerifyEmail();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    
    const id = params.id as string;
    const hash = params.hash as string;
    const expires = searchParams.get("expires");
    const signature = searchParams.get("signature");

    if (id && hash && expires && signature) {
      attempted.current = true;
      verify({ id, hash, expires, signature });
    } else {
      setErrorMessage("Invalid or missing verification parameters.");
    }
  }, [params, searchParams, verify]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-md text-center">
        <div className="mb-6 flex justify-center">
          {isPending && <Loader2 className="h-12 w-12 animate-spin text-neutral-400" />}
          {isSuccess && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
          {(isError || errorMessage) && <XCircle className="h-12 w-12 text-destructive" />}
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">
          Email Verification
        </h1>

        {isPending ? (
          <p className="text-neutral-600">Verifying your email address, please wait...</p>
        ) : null}

        {isSuccess ? (
          <div className="space-y-4">
            <p className="text-neutral-600">
              Your email has been successfully verified! You can now log in to start building your invitation.
            </p>
            <Link href="/login" className="block">
              <Button className="w-full bg-neutral-900 py-6 font-semibold">
                Go to Login
              </Button>
            </Link>
          </div>
        ) : null}

        {(isError || errorMessage) ? (
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>
                {errorMessage || (error as ApiError)?.message || "The verification link may have expired or is invalid."}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-neutral-600">
              Try logging in to resend the verification email.
            </p>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full py-6 font-semibold">
                Back to Login
              </Button>
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
