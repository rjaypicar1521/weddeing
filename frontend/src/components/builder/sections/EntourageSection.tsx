"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
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
import { Select } from '@/components/ui/select';
import {
  createEntourageMember,
  deleteEntourageMember,
  listEntourageMembers,
  reorderEntourageMembers,
  updateEntourageMember,
  uploadMedia,
} from '@/lib/invitation';
import { cn } from '@/lib/utils';
import { EntourageMember, EntourageRole } from '@/types/builder';

const ROLE_OPTIONS: { value: EntourageRole; label: string }[] = [
  { value: 'ninong', label: 'Ninong' },
  { value: 'ninang', label: 'Ninang' },
  { value: 'bridesmaid', label: 'Bridesmaid' },
  { value: 'groomsman', label: 'Groomsman' },
  { value: 'flower_girl', label: 'Flower Girl' },
  { value: 'ring_bearer', label: 'Ring Bearer' },
];

const ROLE_GROUPS: { title: string; roles: EntourageRole[] }[] = [
  { title: 'Principal Sponsors', roles: ['ninong', 'ninang'] },
  { title: 'Bridal Party', roles: ['bridesmaid', 'groomsman'] },
  { title: 'Little Entourage', roles: ['flower_girl', 'ring_bearer'] },
];

const entourageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name is too long'),
  role: z.enum(['ninong', 'ninang', 'bridesmaid', 'groomsman', 'flower_girl', 'ring_bearer']),
  photo_path: z.string().optional().or(z.literal('')),
});

type EntourageFormValues = z.infer<typeof entourageSchema>;

interface EntourageSectionProps {
  onCompletionChange: (complete: boolean) => void;
}

function getRoleLabel(role: EntourageRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'NA';
}

function toFormValues(member?: EntourageMember): EntourageFormValues {
  return {
    name: member?.name ?? '',
    role: member?.role ?? 'ninong',
    photo_path: member?.photo_path ?? '',
  };
}

function EntourageEditor({
  initialMember,
  isSaving,
  onCancel,
  onSubmit,
}: {
  initialMember?: EntourageMember;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: EntourageFormValues) => Promise<void>;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<EntourageFormValues>({
    resolver: zodResolver(entourageSchema),
    defaultValues: toFormValues(initialMember),
  });

  const photoPath = form.watch('photo_path');
  const name = form.watch('name');

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);

    try {
      const response = await uploadMedia({
        file,
        type: 'entourage',
      });

      form.setValue('photo_path', response.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Photo upload failed.');
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
        <label className='text-sm font-medium' htmlFor='entourage-name'>
          Name
        </label>
        <input
          id='entourage-name'
          className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
          placeholder='Full name'
          {...form.register('name')}
        />
        {form.formState.errors.name ? <p className='text-xs text-red-700'>{form.formState.errors.name.message}</p> : null}
      </div>

      <div className='space-y-1'>
        <label className='text-sm font-medium' htmlFor='entourage-role'>
          Role
        </label>
        <Select
          id='entourage-role'
          value={form.watch('role')}
          onChange={(event) => {
            form.setValue('role', event.target.value as EntourageRole, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {form.formState.errors.role ? <p className='text-xs text-red-700'>{form.formState.errors.role.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Photo (Optional)</label>
        {photoPath ? (
          <div className='rounded-lg border border-neutral-200 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <Avatar src={photoPath} alt={name || 'Entourage photo'} fallback={getInitials(name || 'NA')} className='h-16 w-16' />
              <div className='flex gap-2'>
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
          </div>
        ) : (
          <div
            {...dropzone.getRootProps()}
            className='rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-600'
          >
            <input {...dropzone.getInputProps()} />
            {uploading ? 'Uploading photo...' : 'Drag and drop photo, or click to upload'}
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

function SortableMemberCard({
  member,
  isEditing,
  isMutating,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: {
  member: EntourageMember;
  isEditing: boolean;
  isMutating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: EntourageFormValues) => Promise<void>;
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: member.id });
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: member.id });

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
              aria-label='Drag member'
              {...attributes}
              {...listeners}
            >
              Drag
            </button>

            <div className='min-w-0 flex-1 space-y-3'>
              {isEditing ? (
                <EntourageEditor initialMember={member} isSaving={isMutating} onCancel={onCancelEdit} onSubmit={onSaveEdit} />
              ) : (
                <>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-3'>
                      <Avatar src={member.photo_path} alt={member.name} fallback={getInitials(member.name)} />
                      <div>
                        <p className='text-sm font-semibold'>{member.name}</p>
                        <Badge>{getRoleLabel(member.role)}</Badge>
                      </div>
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
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EntourageSection({ onCompletionChange }: EntourageSectionProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntourageMember | null>(null);
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const membersQuery = useQuery({
    queryKey: ['entourage'],
    queryFn: listEntourageMembers,
  });

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data?.members]);

  useEffect(() => {
    const ids = members.map((member) => member.id);
    setReorderIds((current) => {
      if (current.length === 0) {
        return ids;
      }

      const existing = current.filter((id) => ids.includes(id));
      const appended = ids.filter((id) => !existing.includes(id));
      return [...existing, ...appended];
    });
  }, [members]);

  useEffect(() => {
    onCompletionChange(members.length >= 2);
  }, [members.length, onCompletionChange]);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const orderedMembers = useMemo(
    () =>
      reorderIds
        .map((id) => memberById.get(id))
        .filter((member): member is EntourageMember => Boolean(member)),
    [memberById, reorderIds],
  );

  const groupedPreview = useMemo(() => {
    const map = new Map<EntourageRole, EntourageMember[]>();
    for (const member of orderedMembers) {
      const current = map.get(member.role) ?? [];
      current.push(member);
      map.set(member.role, current);
    }
    return map;
  }, [orderedMembers]);

  const createMutation = useMutation({
    mutationFn: createEntourageMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entourage'] });
      setShowAddForm(false);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to create member.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateEntourageMember>[1] }) =>
      updateEntourageMember(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entourage'] });
      setEditingId(null);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to update member.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntourageMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entourage'] });
      setDeleteTarget(null);
      setSectionError(null);
    },
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to delete member.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderEntourageMembers,
    onError: (error: unknown) => {
      setSectionError(error instanceof Error ? error.message : 'Unable to reorder members.');
    },
  });

  const isAtMax = members.length >= 50;

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
          <CardTitle>Entourage</CardTitle>
          <CardDescription>Manage entourage members, roles, and display order.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {sectionError ? (
            <Alert variant='destructive'>
              <AlertTitle>Entourage update failed</AlertTitle>
              <AlertDescription>{sectionError}</AlertDescription>
            </Alert>
          ) : null}

          {!showAddForm && !isAtMax ? (
            <Button type='button' onClick={() => setShowAddForm(true)}>
              Add Member
            </Button>
          ) : null}

          {isAtMax ? <p className='text-sm text-neutral-600'>Maximum members reached (50/50).</p> : null}

          {showAddForm ? (
            <Card className='border-dashed'>
              <CardContent className='p-4'>
                <EntourageEditor
                  isSaving={createMutation.isPending}
                  onCancel={() => setShowAddForm(false)}
                  onSubmit={async (values) => {
                    await createMutation.mutateAsync({
                      name: values.name,
                      role: values.role,
                      photo_path: values.photo_path || null,
                      sort_order: members.length,
                    });
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className='space-y-3'>
              {orderedMembers.map((member) => (
                <SortableMemberCard
                  key={member.id}
                  member={member}
                  isEditing={editingId === member.id}
                  isMutating={updateMutation.isPending && editingId === member.id}
                  onEdit={() => {
                    setEditingId(member.id);
                    setShowAddForm(false);
                  }}
                  onDelete={() => setDeleteTarget(member)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={async (values) => {
                    await updateMutation.mutateAsync({
                      id: member.id,
                      payload: {
                        name: values.name,
                        role: values.role,
                        photo_path: values.photo_path || null,
                      },
                    });
                  }}
                />
              ))}
            </div>
          </DndContext>

          {membersQuery.isLoading ? <p className='text-sm text-neutral-600'>Loading members...</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview by Role</CardTitle>
          <CardDescription>Responsive grouped preview for invitation display.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {ROLE_GROUPS.map((group) => {
            const groupMembers = group.roles.flatMap((role) => groupedPreview.get(role) ?? []);
            if (groupMembers.length === 0) {
              return null;
            }

            return (
              <div key={group.title} className='space-y-2'>
                <h4 className='text-sm font-semibold'>{group.title}</h4>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
                  {groupMembers.map((member) => (
                    <div key={member.id} className='rounded-lg border border-neutral-200 p-3'>
                      <div className='mb-2'>
                        <Avatar src={member.photo_path} alt={member.name} fallback={getInitials(member.name)} />
                      </div>
                      <p className='truncate text-sm font-medium'>{member.name}</p>
                      <Badge className='mt-1'>{getRoleLabel(member.role)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {members.length === 0 ? (
            <p className='text-sm text-neutral-600'>Add entourage members to see grouped preview.</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entourage member?</DialogTitle>
            <DialogDescription>
              This will remove the member and linked photo file, if one is attached.
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
