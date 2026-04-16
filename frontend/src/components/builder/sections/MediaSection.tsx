"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ApiError } from '@/lib/api';
import { deleteMedia, listMedia, uploadMedia } from '@/lib/invitation';
import { cn } from '@/lib/utils';
import { MediaDraft, MediaItem } from '@/types/builder';

const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;

const mediaFormSchema = z.object({
  prenup_video_url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || youtubePattern.test(value), 'Enter a valid YouTube URL.'),
  music_url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || youtubePattern.test(value), 'Enter a valid YouTube URL.'),
});

type MediaFormValues = z.infer<typeof mediaFormSchema>;

interface MediaSectionProps {
  value: MediaDraft;
  onChange: (payload: MediaDraft) => void;
  onHeroUploadedChange: (uploaded: boolean) => void;
}

function bytesToMbLabel(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getYoutubeEmbedUrl(rawUrl: string): string | null {
  if (!youtubePattern.test(rawUrl)) {
    return null;
  }

  try {
    const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    const id = url.searchParams.get('v');
    if (!id) {
      return null;
    }

    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.details && typeof error.details === 'object') {
      const firstIssue = Object.values(error.details as { [key: string]: string | string[] | null | undefined })
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === 'string');

      if (typeof firstIssue === 'string' && firstIssue.trim().length > 0) {
        return firstIssue;
      }
    }

    if (error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function MediaSection({ value, onChange, onHeroUploadedChange }: MediaSectionProps) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [galleryOrder, setGalleryOrder] = useState<number[]>([]);
  const [draggedGalleryId, setDraggedGalleryId] = useState<number | null>(null);
  const currentPlan: 'free' | 'premium' = 'free';

  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: listMedia,
  });

  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    mode: 'onChange',
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [form, value]);

  useEffect(() => {
    const initialValues = form.getValues();
    onChange({
      prenup_video_url: initialValues.prenup_video_url ?? '',
      music_url: initialValues.music_url ?? '',
    });
  }, [form, onChange]);

  useEffect(() => {
    const subscription = form.watch((watched) => {
      onChange({
        prenup_video_url: watched.prenup_video_url ?? '',
        music_url: watched.music_url ?? '',
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, onChange]);

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['media'] });
      setUploadProgress(0);
      setUploadError(null);
    },
    onError: (error: unknown) => {
      setUploadProgress(0);
      setUploadError(getErrorMessage(error, 'Upload failed.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['media'] });
      setUploadError(null);
    },
    onError: (error: unknown) => {
      setUploadError(getErrorMessage(error, 'Delete failed.'));
    },
  });

  const hero = mediaQuery.data?.media.hero?.[0] ?? null;
  const gallery = useMemo(() => mediaQuery.data?.media.gallery ?? [], [mediaQuery.data?.media.gallery]);

  useEffect(() => {
    onHeroUploadedChange(Boolean(hero));
  }, [hero, onHeroUploadedChange]);

  useEffect(() => {
    const ids = gallery.map((item) => item.id);
    setGalleryOrder((current) => {
      if (current.length === 0) {
        return ids;
      }

      const existing = current.filter((id) => ids.includes(id));
      const appended = ids.filter((id) => !existing.includes(id));
      return [...existing, ...appended];
    });
  }, [gallery]);

  const galleryById = useMemo(() => new Map(gallery.map((item) => [item.id, item])), [gallery]);
  const orderedGallery = useMemo(
    () =>
      galleryOrder
        .map((id) => galleryById.get(id))
        .filter((item): item is MediaItem => Boolean(item)),
    [galleryById, galleryOrder],
  );

  const storageUsed = mediaQuery.data?.storage_used_bytes ?? 0;
  const storageLimit = mediaQuery.data?.storage_limit_bytes ?? (currentPlan === 'free' ? 50 * 1024 * 1024 : 500 * 1024 * 1024);
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  const storageBarClass = storagePercent >= 100 ? 'bg-red-600' : storagePercent >= 80 ? 'bg-orange-500' : 'bg-neutral-900';

  const prenupLocked = currentPlan === 'free';
  const prenupEmbed = getYoutubeEmbedUrl(form.watch('prenup_video_url') ?? '');
  const musicEmbed = getYoutubeEmbedUrl(form.watch('music_url') ?? '');

  const onHeroDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      return;
    }

    await uploadMutation.mutateAsync({
      file,
      type: 'hero',
      onUploadProgress: (loaded, total) => {
        setUploadProgress(Math.round((loaded / total) * 100));
      },
    });
  };

  const onGalleryDrop = async (acceptedFiles: File[]) => {
    setUploadError(null);

    for (const file of acceptedFiles) {
      await uploadMutation.mutateAsync({
        file,
        type: 'gallery',
        onUploadProgress: (loaded, total) => {
          setUploadProgress(Math.round((loaded / total) * 100));
        },
      });
    }
  };

  const heroDropzone = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: false,
    onDrop: (files) => {
      void onHeroDrop(files);
    },
  });

  const remainingGallerySlots = Math.max(0, 10 - gallery.length);
  const galleryDropzone = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: remainingGallerySlots,
    onDrop: (files) => {
      void onGalleryDrop(files);
    },
    disabled: remainingGallerySlots === 0,
  });

  const onDropGalleryCard = (targetId: number) => {
    if (draggedGalleryId === null || draggedGalleryId === targetId) {
      return;
    }

    const next = [...galleryOrder];
    const fromIndex = next.indexOf(draggedGalleryId);
    const toIndex = next.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedGalleryId);
    setGalleryOrder(next);
    setDraggedGalleryId(null);
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Upload hero, gallery, and configure media links.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          {uploadProgress > 0 ? (
            <div className='space-y-2'>
              <p className='text-xs text-neutral-600'>Uploading... {uploadProgress}%</p>
              <Progress value={uploadProgress} />
            </div>
          ) : null}

          {uploadError ? (
            <Alert variant='destructive'>
              <AlertTitle>Upload error</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          ) : null}

          <div className='space-y-2 rounded-lg border border-neutral-200 p-3'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-medium'>Storage Usage</p>
              <Badge>
                {bytesToMbLabel(storageUsed)} used of {bytesToMbLabel(storageLimit)}
              </Badge>
            </div>
            <Progress value={storagePercent} indicatorClassName={storageBarClass} />
          </div>

          <div className='space-y-3'>
            <h3 className='font-semibold'>Hero Photo</h3>
            {hero ? (
              <div className='group relative overflow-hidden rounded-lg border border-neutral-200'>
                <input {...heroDropzone.getInputProps()} className='hidden' />
                <Image src={hero.url} alt='Hero preview' width={1200} height={600} className='h-56 w-full object-cover' />
                <div className='absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 group-hover:flex'>
                  <Button type='button' onClick={() => heroDropzone.open()}>
                    Replace
                  </Button>
                  <Button type='button' variant='outline' onClick={() => deleteMutation.mutate(hero.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div
                {...heroDropzone.getRootProps()}
                className={cn(
                  'rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-6 text-center',
                  heroDropzone.isDragActive && 'border-neutral-900 bg-neutral-100',
                  heroDropzone.isDragReject && 'border-red-500 bg-red-50',
                )}
              >
                <input {...heroDropzone.getInputProps()} className='hidden' />
                <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
                  <div className='rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600'>
                    Cover image
                  </div>
                  <div className='space-y-1'>
                    <p className='text-base font-semibold text-neutral-900'>Upload your hero photo</p>
                    <p className='text-sm text-neutral-600'>
                      Add the main image guests will see first. Drag and drop here or use the upload button.
                    </p>
                  </div>
                  <Button type='button' onClick={(event) => {
                    event.stopPropagation();
                    heroDropzone.open();
                  }}>
                    Upload Image
                  </Button>
                  <p className='text-xs text-neutral-500'>Accepted formats: JPG or PNG</p>
                </div>
              </div>
            )}
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold'>Gallery</h3>
              <Badge>
                {gallery.length} / 10 photos
              </Badge>
            </div>

            <div
              {...galleryDropzone.getRootProps()}
              className={cn(
                'rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-5 text-center',
                galleryDropzone.isDragActive && 'border-neutral-900 bg-neutral-50',
                galleryDropzone.isDragReject && 'border-red-500',
              )}
            >
              <input {...galleryDropzone.getInputProps()} className='hidden' />
              {remainingGallerySlots === 0 ? (
                <p className='text-sm text-neutral-600'>Gallery is full.</p>
              ) : (
                <div className='mx-auto flex max-w-md flex-col items-center gap-3'>
                  <div className='space-y-1'>
                    <p className='text-base font-semibold text-neutral-900'>Add gallery photos</p>
                    <p className='text-sm text-neutral-600'>
                      Upload supporting moments for your invitation story. You still have {remainingGallerySlots} slot{remainingGallerySlots === 1 ? '' : 's'} left.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={(event) => {
                      event.stopPropagation();
                      galleryDropzone.open();
                    }}
                  >
                    Upload Image
                  </Button>
                  <p className='text-xs text-neutral-500'>Accepted formats: JPG or PNG</p>
                </div>
              )}
            </div>

            <div className='grid grid-cols-3 gap-2'>
              {orderedGallery.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedGalleryId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDropGalleryCard(item.id)}
                  className='group relative overflow-hidden rounded-lg border border-neutral-200'
                >
                  <Image src={item.url} alt={item.file_name ?? 'Gallery'} width={400} height={400} className='h-28 w-full object-cover' />
                  <button
                    type='button'
                    className='absolute right-2 top-2 hidden rounded bg-black/60 px-2 py-1 text-xs text-white group-hover:block'
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='space-y-3'>
            <h3 className='font-semibold'>Prenup Video (YouTube)</h3>
            <div className='space-y-2'>
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                placeholder='https://www.youtube.com/watch?v=...'
                value={form.watch('prenup_video_url') ?? ''}
                readOnly={prenupLocked}
                onClick={() => {
                  if (prenupLocked) {
                    setUpgradeDialogOpen(true);
                  }
                }}
                onChange={(event) => {
                  if (prenupLocked) {
                    return;
                  }

                  form.setValue('prenup_video_url', event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              {prenupLocked ? <p className='text-xs text-neutral-500'>🔒 Premium only</p> : null}
              {form.formState.errors.prenup_video_url ? (
                <p className='text-xs text-red-700'>{form.formState.errors.prenup_video_url.message}</p>
              ) : null}
            </div>
            {prenupEmbed ? (
              <iframe className='h-48 w-full rounded-lg border border-neutral-200' src={prenupEmbed} title='Prenup preview' />
            ) : null}
          </div>

          <div className='space-y-3'>
            <h3 className='font-semibold'>Background Music (YouTube)</h3>
            <div className='space-y-2'>
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                placeholder='https://www.youtube.com/watch?v=...'
                value={form.watch('music_url') ?? ''}
                onChange={(event) => {
                  form.setValue('music_url', event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              {form.formState.errors.music_url ? (
                <p className='text-xs text-red-700'>{form.formState.errors.music_url.message}</p>
              ) : null}
            </div>
            {musicEmbed ? (
              <iframe className='h-24 w-full rounded-lg border border-neutral-200' src={musicEmbed} title='Music preview' />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Premium</DialogTitle>
            <DialogDescription>Upgrade to Premium to unlock prenup video embed and more media options.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Maybe later</DialogClose>
            <Button type='button'>Upgrade now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
