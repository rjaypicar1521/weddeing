"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getInvitation, saveGiftMethods, uploadMedia } from '@/lib/invitation';
import { GiftMethod } from '@/types/builder';

const giftMethodSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(255),
  account_name: z.string().trim().min(1, 'Account name is required').max(255),
  account_number: z.string().trim().min(1, 'Account number is required').max(255),
  qr_path: z.string().trim().min(1, 'QR path is required'),
});

const giftMethodsFormSchema = z.object({
  gift_methods: z.array(giftMethodSchema).max(3, 'Maximum 3 gift methods'),
});

type GiftMethodsFormValues = z.infer<typeof giftMethodsFormSchema>;

interface GiftQrSectionProps {
  onCompletionChange: (complete: boolean) => void;
}

function emptyGiftMethod(): GiftMethod {
  return {
    label: '',
    account_name: '',
    account_number: '',
    qr_path: '',
  };
}

function GiftMethodUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const dropzone = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 2 * 1024 * 1024,
    multiple: false,
    onDropRejected: () => {
      setUploadError('QR code must be JPG/PNG and up to 2MB.');
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      setUploadError(null);
      setUploading(true);
      try {
        const response = await uploadMedia({
          file,
          type: 'qr_code',
        });
        onChange(response.url);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'QR upload failed.');
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <div className='space-y-2'>
      {value ? (
        <div className='rounded-lg border border-neutral-200 p-3'>
          <p className='mb-2 text-xs text-neutral-600'>QR uploaded</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt='QR preview' className='h-32 w-32 rounded-md border border-neutral-200 object-cover' />
          <div className='mt-2 flex gap-2'>
            <Button type='button' variant='outline' className='px-2 py-1 text-xs' onClick={() => dropzone.open()}>
              Replace
            </Button>
            <Button type='button' variant='outline' className='px-2 py-1 text-xs' onClick={() => onChange('')}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...dropzone.getRootProps()}
          className='rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-5 text-center'
        >
          <input {...dropzone.getInputProps()} className='hidden' />
          {uploading ? (
            <p className='text-sm text-neutral-600'>Uploading QR...</p>
          ) : (
            <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
              <div className='space-y-1'>
                <p className='text-base font-semibold text-neutral-900'>Upload QR image</p>
                <p className='text-sm text-neutral-600'>
                  Add a scannable payment code for this gift method. Drag and drop here or use the upload button.
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                onClick={(event) => {
                  event.stopPropagation();
                  dropzone.open();
                }}
              >
                Upload Image
              </Button>
              <p className='text-xs text-neutral-500'>Accepted formats: JPG or PNG, up to 2MB</p>
            </div>
          )}
        </div>
      )}
      {uploadError ? <p className='text-xs text-red-700'>{uploadError}</p> : null}
    </div>
  );
}

export function GiftQrSection({ onCompletionChange }: GiftQrSectionProps) {
  const [sectionError, setSectionError] = useState<string | null>(null);

  const invitationQuery = useQuery({
    queryKey: ['invitation', 'gift-methods'],
    queryFn: getInvitation,
    staleTime: 60_000,
  });

  const form = useForm<GiftMethodsFormValues>({
    resolver: zodResolver(giftMethodsFormSchema),
    defaultValues: {
      gift_methods: [emptyGiftMethod()],
    },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'gift_methods',
  });

  useEffect(() => {
    const giftMethods = invitationQuery.data?.invitation.gift_methods;
    if (!giftMethods) {
      return;
    }

    form.reset({
      gift_methods: giftMethods.length > 0 ? giftMethods : [emptyGiftMethod()],
    });
  }, [form, invitationQuery.data?.invitation.gift_methods]);

  const methods = form.watch('gift_methods');

  const validMethodsCount = useMemo(
    () =>
      methods.filter(
        (method) =>
          method.label.trim() &&
          method.account_name.trim() &&
          method.account_number.trim() &&
          method.qr_path.trim(),
      ).length,
    [methods],
  );

  useEffect(() => {
    onCompletionChange(validMethodsCount >= 1);
  }, [onCompletionChange, validMethodsCount]);

  const saveMutation = useMutation({
    mutationFn: saveGiftMethods,
    onSuccess: () => {
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to save gift methods.');
    },
  });

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Gift & QR</CardTitle>
          <CardDescription>Add up to 3 gift methods and upload QR codes for each.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {sectionError ? (
            <Alert variant='destructive'>
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{sectionError}</AlertDescription>
            </Alert>
          ) : null}

          <Accordion>
            {fieldArray.fields.map((field, index) => (
              <AccordionItem key={field.id} open={index === 0}>
                <AccordionTrigger>
                  Gift Method {index + 1}: {methods[index]?.label || 'Untitled'}
                </AccordionTrigger>
                <AccordionContent>
                  <div className='space-y-3'>
                    <div className='space-y-1'>
                      <label className='text-sm font-medium'>Label</label>
                      <Input placeholder='GCash / Bank Deposit / Maya' {...form.register(`gift_methods.${index}.label`)} />
                    </div>

                    <div className='space-y-1'>
                      <label className='text-sm font-medium'>Account Name</label>
                      <Input placeholder='Juan Dela Cruz' {...form.register(`gift_methods.${index}.account_name`)} />
                    </div>

                    <div className='space-y-1'>
                      <label className='text-sm font-medium'>Account Number</label>
                      <Input placeholder='09123456789' {...form.register(`gift_methods.${index}.account_number`)} />
                    </div>

                    <div className='space-y-1'>
                      <label className='text-sm font-medium'>QR Code Upload</label>
                      <GiftMethodUploader
                        value={methods[index]?.qr_path ?? ''}
                        onChange={(next) => {
                          form.setValue(`gift_methods.${index}.qr_path`, next, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </div>

                    {fieldArray.fields.length >= 2 ? (
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => fieldArray.remove(index)}
                      >
                        Remove Gift Method
                      </Button>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => fieldArray.append(emptyGiftMethod())}
              disabled={fieldArray.fields.length >= 3}
            >
              Add Gift Method
            </Button>

            <Button
              type='button'
              onClick={form.handleSubmit(async (values) => {
                await saveMutation.mutateAsync(values.gift_methods);
              })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Gift Methods'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Guest-facing gift methods preview.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {methods
              .filter((method) => method.label || method.account_name || method.account_number || method.qr_path)
              .map((method, index) => (
                <div key={`${method.label}-${index}`} className='rounded-lg border border-neutral-200 p-3'>
                  <p className='font-semibold'>{method.label || 'Gift Method'}</p>
                  <p className='text-sm text-neutral-600'>{method.account_name || '-'}</p>
                  <p className='text-sm text-neutral-600'>{method.account_number || '-'}</p>
                  {method.qr_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={method.qr_path} alt={`${method.label || 'Gift'} QR`} className='mt-2 h-28 w-28 rounded-md border border-neutral-200 object-cover' />
                  ) : (
                    <p className='mt-2 text-xs text-neutral-500'>No QR uploaded</p>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
