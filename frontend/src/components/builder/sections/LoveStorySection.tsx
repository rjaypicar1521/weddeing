"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import {
  createLoveStoryChapter,
  deleteLoveStoryChapter,
  listLoveStoryChapters,
  reorderLoveStoryChapters,
  updateLoveStoryChapter,
  uploadMedia,
} from '@/lib/invitation';
import { cn } from '@/lib/utils';
import { LoveStoryChapter } from '@/types/builder';

const chapterSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title is too long'),
  story_text: z.string().trim().min(1, 'Story text is required').max(5000, 'Story is too long'),
  chapter_date: z.string().optional().or(z.literal('')),
  photo_path: z.string().optional().or(z.literal('')),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

interface LoveStorySectionProps {
  onCompletionChange: (complete: boolean) => void;
}

function toFormValues(chapter?: LoveStoryChapter): ChapterFormValues {
  return {
    title: chapter?.title ?? '',
    story_text: chapter?.story_text ?? '',
    chapter_date: chapter?.chapter_date ?? '',
    photo_path: chapter?.photo_path ?? '',
  };
}

function ChapterEditor({
  initialChapter,
  isSaving,
  onCancel,
  onSubmit,
}: {
  initialChapter?: LoveStoryChapter;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: ChapterFormValues) => Promise<void>;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: toFormValues(initialChapter),
  });

  const photoPath = form.watch('photo_path');

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);

    try {
      const response = await uploadMedia({
        file,
        type: 'chapter',
      });

      form.setValue('photo_path', response.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Chapter photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const dropzone = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      void handleUpload(file);
    },
  });

  return (
    <form
      className='space-y-3'
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className='space-y-1'>
        <label className='text-sm font-medium' htmlFor='chapter-title'>
          Title
        </label>
        <input
          id='chapter-title'
          className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
          placeholder='How We Met'
          {...form.register('title')}
        />
        {form.formState.errors.title ? <p className='text-xs text-red-700'>{form.formState.errors.title.message}</p> : null}
      </div>

      <div className='space-y-1'>
        <label className='text-sm font-medium' htmlFor='chapter-story'>
          Story Text
        </label>
        <Textarea id='chapter-story' placeholder='Tell your chapter...' {...form.register('story_text')} />
        {form.formState.errors.story_text ? (
          <p className='text-xs text-red-700'>{form.formState.errors.story_text.message}</p>
        ) : null}
      </div>

      <div className='space-y-1'>
        <label className='text-sm font-medium' htmlFor='chapter-date'>
          Chapter Date (Optional)
        </label>
        <input id='chapter-date' type='date' className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm' {...form.register('chapter_date')} />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Photo (Optional)</label>
        {photoPath ? (
          <div className='relative overflow-hidden rounded-lg border border-neutral-200'>
            <Image src={photoPath} alt='Chapter photo preview' width={720} height={360} className='h-44 w-full object-cover' />
            <div className='absolute right-2 top-2 flex gap-2'>
              <Button type='button' variant='outline' className='px-2 py-1 text-xs' onClick={() => dropzone.open()}>
                Replace
              </Button>
              <Button
                type='button'
                variant='outline'
                className='px-2 py-1 text-xs'
                onClick={() => form.setValue('photo_path', '', { shouldDirty: true, shouldValidate: true })}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            {...dropzone.getRootProps()}
            className='rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-600'
          >
            <input {...dropzone.getInputProps()} />
            {uploading ? 'Uploading chapter photo...' : 'Drag and drop chapter photo, or click to upload'}
          </div>
        )}
        {uploadError ? <p className='text-xs text-red-700'>{uploadError}</p> : null}
      </div>

      <div className='flex items-center gap-2'>
        <Button type='submit' disabled={isSaving || uploading}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button type='button' variant='outline' onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SortableChapterCard({
  chapter,
  isEditing,
  isMutating,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: {
  chapter: LoveStoryChapter;
  isEditing: boolean;
  isMutating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: ChapterFormValues) => Promise<void>;
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: chapter.id });
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: chapter.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setDroppableRef}>
      <Card className={cn('border-neutral-200', isDragging && 'opacity-75')}>
        <CardContent className='p-4' style={style}>
          <div ref={setDraggableRef} className='flex items-start gap-3'>
          <button
            type='button'
            className='mt-1 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600'
            aria-label='Drag chapter'
            {...attributes}
            {...listeners}
          >
            Drag
          </button>

          <div className='min-w-0 flex-1 space-y-3'>
            {isEditing ? (
              <ChapterEditor initialChapter={chapter} isSaving={isMutating} onCancel={onCancelEdit} onSubmit={onSaveEdit} />
            ) : (
              <>
                <div className='flex items-center justify-between gap-2'>
                  <div>
                    <h4 className='text-base font-semibold'>{chapter.title}</h4>
                    {chapter.chapter_date ? <p className='text-xs text-neutral-500'>{chapter.chapter_date}</p> : null}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button type='button' variant='outline' className='px-2 py-1 text-xs' onClick={onEdit}>
                      Edit
                    </Button>
                    <Button type='button' variant='outline' className='px-2 py-1 text-xs' onClick={onDelete}>
                      Delete
                    </Button>
                  </div>
                </div>

                {chapter.photo_path ? (
                  <Image src={chapter.photo_path} alt={chapter.title} width={920} height={340} className='h-40 w-full rounded-lg object-cover' />
                ) : null}

                <p className='line-clamp-3 text-sm text-neutral-700'>{chapter.story_text}</p>
              </>
            )}
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LoveStorySection({ onCompletionChange }: LoveStorySectionProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoveStoryChapter | null>(null);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const chaptersQuery = useQuery({
    queryKey: ['love-story'],
    queryFn: listLoveStoryChapters,
  });

  const chapters = useMemo(() => chaptersQuery.data?.chapters ?? [], [chaptersQuery.data?.chapters]);

  useEffect(() => {
    const ids = chapters.map((chapter) => chapter.id);

    setReorderIds((current) => {
      if (current.length === 0) {
        return ids;
      }

      const existing = current.filter((id) => ids.includes(id));
      const appended = ids.filter((id) => !existing.includes(id));
      return [...existing, ...appended];
    });
  }, [chapters]);

  useEffect(() => {
    onCompletionChange(chapters.length > 0);
  }, [chapters.length, onCompletionChange]);

  const chapterById = useMemo(() => new Map(chapters.map((chapter) => [chapter.id, chapter])), [chapters]);
  const orderedChapters = useMemo(
    () =>
      reorderIds
        .map((id) => chapterById.get(id))
        .filter((chapter): chapter is LoveStoryChapter => Boolean(chapter)),
    [chapterById, reorderIds],
  );

  const createMutation = useMutation({
    mutationFn: createLoveStoryChapter,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['love-story'] });
      setShowAddForm(false);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to create chapter.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateLoveStoryChapter>[1] }) =>
      updateLoveStoryChapter(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['love-story'] });
      setEditingId(null);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to update chapter.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLoveStoryChapter,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['love-story'] });
      setDeleteTarget(null);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to delete chapter.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderLoveStoryChapters,
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to reorder chapters.');
    },
  });

  const isAtMax = chapters.length >= 10;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = Number(active.id);
    const overId = Number(over.id);

    const nextIds = [...reorderIds];
    const fromIndex = nextIds.indexOf(activeId);
    const toIndex = nextIds.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, activeId);
    setReorderIds(nextIds);

    reorderMutation.mutate(nextIds);
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Love Story</CardTitle>
          <CardDescription>Create up to 10 chapters and reorder them to tell your timeline.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {sectionError ? (
            <Alert variant='destructive'>
              <AlertTitle>Love Story update failed</AlertTitle>
              <AlertDescription>{sectionError}</AlertDescription>
            </Alert>
          ) : null}

          {chapters.length === 0 ? (
            <Alert>
              <AlertTitle>Recommended</AlertTitle>
              <AlertDescription>Add at least one chapter to tell your story.</AlertDescription>
            </Alert>
          ) : null}

          {!showAddForm && !isAtMax ? (
            <Button type='button' onClick={() => setShowAddForm(true)}>
              Add Chapter
            </Button>
          ) : null}

          {isAtMax ? <p className='text-sm text-neutral-600'>Maximum chapters reached (10/10).</p> : null}

          {showAddForm ? (
            <Card className='border-dashed'>
              <CardContent className='p-4'>
                <ChapterEditor
                  isSaving={createMutation.isPending}
                  onCancel={() => setShowAddForm(false)}
                  onSubmit={async (values) => {
                    await createMutation.mutateAsync({
                      title: values.title,
                      story_text: values.story_text,
                      chapter_date: values.chapter_date || null,
                      photo_path: values.photo_path || null,
                      sort_order: chapters.length,
                    });
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className='space-y-3'>
              {orderedChapters.map((chapter) => (
                <SortableChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  isEditing={editingId === chapter.id}
                  isMutating={updateMutation.isPending && editingId === chapter.id}
                  onEdit={() => {
                    setEditingId(chapter.id);
                    setShowAddForm(false);
                  }}
                  onDelete={() => setDeleteTarget(chapter)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={async (values) => {
                    await updateMutation.mutateAsync({
                      id: chapter.id,
                      payload: {
                        title: values.title,
                        story_text: values.story_text,
                        chapter_date: values.chapter_date || null,
                        photo_path: values.photo_path || null,
                      },
                    });
                  }}
                />
              ))}
            </div>
          </DndContext>

          {chaptersQuery.isLoading ? <p className='text-sm text-neutral-600'>Loading chapters...</p> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chapter?</DialogTitle>
            <DialogDescription>
              This will permanently remove the chapter and its linked photo file, if any.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className='rounded-md border border-neutral-300 px-4 py-2 text-sm'>Cancel</DialogClose>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
