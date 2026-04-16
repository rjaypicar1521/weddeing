"use client";

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { WeddingProgramDraft } from '@/types/builder';

const scheduleItemSchema = z.object({
  id: z.string().min(1),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour format (HH:MM).'),
  event: z.string().min(1, 'Event name is required.').max(255, 'Event name is too long.'),
  description: z.string().max(1000, 'Description is too long.').optional().or(z.literal('')),
});

const weddingProgramSchema = z.object({
  schedule: z.array(scheduleItemSchema).max(20, 'You can add up to 20 schedule items.'),
});

type WeddingProgramFormValues = z.infer<typeof weddingProgramSchema>;

interface WeddingProgramSectionProps {
  value: WeddingProgramDraft;
  onChange: (payload: WeddingProgramDraft) => void;
}

function createScheduleItem() {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: '',
    event: '',
    description: '',
  };
}

function normalizeSchedule(
  items: Array<Partial<WeddingProgramFormValues['schedule'][number]>>,
) {
  return items.map((item) => ({
    id: item.id ?? '',
    time: item.time ?? '',
    event: item.event ?? '',
    description: item.description ?? '',
  }));
}

export function WeddingProgramSection({ value, onChange }: WeddingProgramSectionProps) {
  const form = useForm<WeddingProgramFormValues>({
    resolver: zodResolver(weddingProgramSchema),
    mode: 'onChange',
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [form, value]);

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'schedule',
  });

  useEffect(() => {
    onChange({ schedule: normalizeSchedule(form.getValues('schedule') ?? []) });

    const subscription = form.watch((values) => {
      onChange({ schedule: normalizeSchedule(values.schedule ?? []) });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, onChange]);

  const watchedSchedule = form.watch('schedule');

  const timelineItems = useMemo(
    () =>
      (watchedSchedule ?? []).map((item, index) => ({
        key: item.id || `timeline-${index}`,
        time: item.time || '--:--',
        event: item.event || 'Event name',
        description: item.description?.trim() || '',
      })),
    [watchedSchedule],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = fields.findIndex((field) => field.id === String(active.id));
    const toIndex = fields.findIndex((field) => field.id === String(over.id));
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    move(fromIndex, toIndex);
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Wedding Program</CardTitle>
          <CardDescription>
            Build your wedding day schedule. This section is complete when at least one schedule item exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion>
            <AccordionItem open>
              <AccordionTrigger>Wedding Day Schedule</AccordionTrigger>
              <AccordionContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-neutral-600'>Use 24-hour time format (example: 14:00).</p>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => append(createScheduleItem())}
                    disabled={fields.length >= 20}
                  >
                    Add Item
                  </Button>
                </div>

                {form.formState.errors.schedule ? (
                  <p className='text-xs text-red-700'>{form.formState.errors.schedule.message as string}</p>
                ) : null}

                <DndContext onDragEnd={handleDragEnd}>
                  <div className='space-y-3'>
                    {fields.map((field, index) => (
                      <Card
                        key={field.id}
                        id={field.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', field.id);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const draggedId = event.dataTransfer.getData('text/plain');
                          if (!draggedId || draggedId === field.id) {
                            return;
                          }

                          const fromIndex = fields.findIndex((entry) => entry.id === draggedId);
                          if (fromIndex >= 0) {
                            move(fromIndex, index);
                          }
                        }}
                      >
                        <CardContent className='space-y-3 p-4'>
                          <p className='text-xs font-medium text-neutral-500'>Drag handle: use this card to reorder</p>

                          <div className='grid gap-2 md:grid-cols-[160px_1fr_auto]'>
                            <label className='space-y-1 text-sm font-medium'>
                              Time
                              <input
                                type='time'
                                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                                {...form.register(`schedule.${index}.time`)}
                              />
                            </label>

                            <label className='space-y-1 text-sm font-medium'>
                              Event Name
                              <input
                                placeholder='Ceremony Begins'
                                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                                {...form.register(`schedule.${index}.event`)}
                              />
                            </label>

                            <div className='flex items-end'>
                              <Button type='button' variant='outline' onClick={() => remove(index)}>
                                Delete
                              </Button>
                            </div>
                          </div>

                          <label className='space-y-1 text-sm font-medium'>
                            Description
                            <Textarea
                              placeholder='Optional location or context'
                              className='min-h-20'
                              {...form.register(`schedule.${index}.description`)}
                            />
                          </label>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DndContext>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Preview</CardTitle>
          <CardDescription>Guest preview timeline for the wedding day schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <p className='text-sm text-amber-700'>Add at least one schedule item to complete this section.</p>
          ) : (
            <ol className='space-y-4'>
              {timelineItems.map((item) => (
                <li key={item.key} className='grid grid-cols-[88px_1fr] gap-3'>
                  <span className='inline-flex h-fit w-fit rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700'>
                    {item.time}
                  </span>
                  <div className='rounded-md border border-neutral-200 p-3'>
                    <p className='text-sm font-semibold text-neutral-900'>{item.event}</p>
                    {item.description ? <p className='mt-1 text-sm text-neutral-600'>{item.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
