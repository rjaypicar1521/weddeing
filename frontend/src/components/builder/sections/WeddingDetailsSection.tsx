"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeddingDetailsDraft } from '@/types/builder';

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const weddingDetailsSchema = z.object({
  partner1_name: z.string().min(1, 'Partner 1 name is required.').max(255, 'Name is too long.'),
  partner2_name: z.string().min(1, 'Partner 2 name is required.').max(255, 'Name is too long.'),
  wedding_date: z
    .string()
    .min(1, 'Wedding date is required.')
    .refine(
      (value) => {
        const selected = new Date(`${value}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return selected > today;
      },
      { message: 'Wedding date must be a future date.' },
    ),
  wedding_time: z.string().optional().or(z.literal('')),
  venue_name: z.string().min(1, 'Venue name is required.').max(255, 'Venue name is too long.'),
  venue_address: z.string().max(1000, 'Venue address is too long.').optional().or(z.literal('')),
  dress_code: z.string().max(255, 'Dress code is too long.').optional().or(z.literal('')),
  dress_code_colors: z
    .array(z.string().regex(hexColorPattern, 'Enter a valid hex color.'))
    .max(5, 'You can add up to 5 colors.'),
});

type WeddingDetailsFormValues = z.infer<typeof weddingDetailsSchema>;
type PartialWeddingDetailsValues = {
  partner1_name?: string;
  partner2_name?: string;
  wedding_date?: string;
  wedding_time?: string;
  venue_name?: string;
  venue_address?: string;
  dress_code?: string;
  dress_code_colors?: string[];
};

interface WeddingDetailsSectionProps {
  value: WeddingDetailsDraft;
  onChange: (payload: WeddingDetailsDraft) => void;
}

function normalizeWeddingDetails(values: PartialWeddingDetailsValues): WeddingDetailsDraft {
  return {
    partner1_name: values.partner1_name ?? '',
    partner2_name: values.partner2_name ?? '',
    wedding_date: values.wedding_date ?? '',
    wedding_time: values.wedding_time ?? '',
    venue_name: values.venue_name ?? '',
    venue_address: values.venue_address ?? '',
    dress_code: values.dress_code ?? '',
    dress_code_colors: values.dress_code_colors ?? [],
  };
}

export function WeddingDetailsSection({ value, onChange }: WeddingDetailsSectionProps) {
  const [newColorValue, setNewColorValue] = useState('');

  const form = useForm<WeddingDetailsFormValues>({
    resolver: zodResolver(weddingDetailsSchema),
    mode: 'onChange',
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [form, value]);

  useEffect(() => {
    onChange(normalizeWeddingDetails(form.getValues()));

    const subscription = form.watch((values) => {
      onChange(normalizeWeddingDetails(values));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, onChange]);

  const watched = form.watch();

  const dressCodeColors = form.watch('dress_code_colors') ?? [];

  const previewDate = useMemo(() => {
    if (!watched.wedding_date) {
      return 'Date not selected';
    }

    const asDate = new Date(`${watched.wedding_date}T00:00:00`);
    return Number.isNaN(asDate.getTime()) ? 'Date not selected' : asDate.toLocaleDateString();
  }, [watched.wedding_date]);

  const minWeddingDate = useMemo(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }, []);

  const addColor = () => {
    const trimmed = newColorValue.trim();

    if (!hexColorPattern.test(trimmed)) {
      form.setError('dress_code_colors', { type: 'manual', message: 'Enter a valid hex color like #C4A484.' });
      return;
    }

    if (dressCodeColors.length >= 5) {
      form.setError('dress_code_colors', { type: 'manual', message: 'You can add up to 5 colors only.' });
      return;
    }

    form.clearErrors('dress_code_colors');
    form.setValue('dress_code_colors', [...dressCodeColors, trimmed.toUpperCase()], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setNewColorValue('');
  };

  const updateColorAt = (index: number, nextValue: string) => {
    const nextColors = [...dressCodeColors];
    nextColors[index] = nextValue;

    form.setValue('dress_code_colors', nextColors, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeColorAt = (index: number) => {
    const nextColors = dressCodeColors.filter((_, current) => current !== index);

    form.setValue('dress_code_colors', nextColors, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Wedding Details</CardTitle>
          <CardDescription>Fill in core event details. This section is complete when both names, date, and venue are set.</CardDescription>
        </CardHeader>

        <CardContent className='space-y-5'>
          <div className='grid gap-4 md:grid-cols-2'>
            <label className='space-y-1 text-sm font-medium'>
              Partner 1 Name
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                {...form.register('partner1_name')}
              />
              {form.formState.errors.partner1_name ? (
                <span className='text-xs text-red-700'>{form.formState.errors.partner1_name.message}</span>
              ) : null}
            </label>

            <label className='space-y-1 text-sm font-medium'>
              Partner 2 Name
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                {...form.register('partner2_name')}
              />
              {form.formState.errors.partner2_name ? (
                <span className='text-xs text-red-700'>{form.formState.errors.partner2_name.message}</span>
              ) : null}
            </label>

            <label className='space-y-1 text-sm font-medium'>
              Wedding Date
              <input
                type='date'
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                min={minWeddingDate}
                {...form.register('wedding_date')}
              />
              {form.formState.errors.wedding_date ? (
                <span className='text-xs text-red-700'>{form.formState.errors.wedding_date.message}</span>
              ) : null}
            </label>

            <label className='space-y-1 text-sm font-medium'>
              Wedding Time
              <input
                type='time'
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                {...form.register('wedding_time')}
              />
            </label>

            <label className='space-y-1 text-sm font-medium'>
              Venue Name
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                {...form.register('venue_name')}
              />
              {form.formState.errors.venue_name ? (
                <span className='text-xs text-red-700'>{form.formState.errors.venue_name.message}</span>
              ) : null}
            </label>

            <label className='space-y-1 text-sm font-medium md:col-span-2'>
              Venue Address
              <textarea className='min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm' {...form.register('venue_address')} />
              {form.formState.errors.venue_address ? (
                <span className='text-xs text-red-700'>{form.formState.errors.venue_address.message}</span>
              ) : null}
            </label>

            <label className='space-y-1 text-sm font-medium'>
              Dress Code
              <input
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm'
                {...form.register('dress_code')}
              />
              {form.formState.errors.dress_code ? (
                <span className='text-xs text-red-700'>{form.formState.errors.dress_code.message}</span>
              ) : null}
            </label>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Dress Code Colors (max 5)</p>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <input
                value={newColorValue}
                onChange={(event) => setNewColorValue(event.target.value)}
                placeholder='#C4A484'
                className='w-full rounded-md border border-neutral-300 px-3 py-2 text-sm sm:max-w-40'
              />
              <Button type='button' variant='outline' onClick={addColor}>
                Add color
              </Button>
            </div>

            {form.formState.errors.dress_code_colors ? (
              <p className='text-xs text-red-700'>{form.formState.errors.dress_code_colors.message as string}</p>
            ) : null}

            <div className='space-y-2'>
              {dressCodeColors.map((color, index) => (
                <div key={`${color}-${index}`} className='flex flex-wrap items-center gap-2'>
                  <span className='h-7 w-7 rounded-full border border-neutral-300' style={{ backgroundColor: color }} />
                  <input
                    value={color}
                    onChange={(event) => updateColorAt(index, event.target.value)}
                    className='rounded-md border border-neutral-300 px-2 py-1 text-sm'
                  />
                  <Button type='button' variant='outline' onClick={() => removeColorAt(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>This preview updates as you type.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-xl font-semibold'>
            {watched.partner1_name || 'Partner 1'} &amp; {watched.partner2_name || 'Partner 2'}
          </p>
          <p className='text-sm text-neutral-700'>
            {previewDate}
            {watched.wedding_time ? ` at ${watched.wedding_time}` : ''}
          </p>
          <p className='text-sm text-neutral-700'>{watched.venue_name || 'Venue name'} </p>
          <p className='text-sm text-neutral-500'>{watched.venue_address || 'Venue address'}</p>

          <div>
            <p className='text-sm font-medium'>Dress code: {watched.dress_code || 'Not set'}</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {(watched.dress_code_colors ?? []).map((color, index) => (
                <span key={`${color}-preview-${index}`} className='h-6 w-6 rounded-full border border-neutral-300' style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

