"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  text: string;
  label?: string;
  onCopied?: () => void;
}

export function CopyButton({ text, label = 'Copy', onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type='button'
      variant='outline'
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopied?.();
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
