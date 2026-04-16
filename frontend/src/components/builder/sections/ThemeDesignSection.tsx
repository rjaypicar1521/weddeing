"use client";

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { listTemplates } from '@/lib/invitation';
import { cn } from '@/lib/utils';
import {
  InvitationTemplateSummary,
  ThemeColorPalette,
  ThemeDesignDraft,
  WEDDING_THEMES,
  WeddingThemeKey,
} from '@/types/builder';

const themeKeys = WEDDING_THEMES.map((theme) => theme.key) as [WeddingThemeKey, ...WeddingThemeKey[]];

const paletteSchema = z.object({
  accent: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Enter a valid hex color.'),
  secondary: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/),
  surface: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/),
  text: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/),
});

const themeDesignSchema = z.object({
  theme_key: z.enum(themeKeys).nullable(),
  font_pairing: z.string().nullable(),
  template_id: z.number().nullable(),
  color_palette: paletteSchema.nullable(),
});

type ThemeDesignFormValues = z.infer<typeof themeDesignSchema>;

interface ThemeDesignSectionProps {
  value: ThemeDesignDraft;
  onChange: (payload: ThemeDesignDraft) => void;
}

function getThemeByKey(themeKey: WeddingThemeKey | null) {
  if (!themeKey) {
    return null;
  }

  return WEDDING_THEMES.find((theme) => theme.key === themeKey) ?? null;
}

function clonePalette(palette: ThemeColorPalette): ThemeColorPalette {
  return {
    accent: palette.accent,
    secondary: palette.secondary,
    surface: palette.surface,
    text: palette.text,
  };
}

export function ThemeDesignSection({ value, onChange }: ThemeDesignSectionProps) {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const currentPlan: 'free' | 'premium' = 'free';

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
    staleTime: 60_000,
  });

  const defaultTheme = getThemeByKey(value.theme_key) ?? WEDDING_THEMES[0];
  const form = useForm<ThemeDesignFormValues>({
    resolver: zodResolver(themeDesignSchema),
    mode: 'onChange',
    defaultValues: {
      theme_key: value.theme_key ?? defaultTheme.key,
      font_pairing: value.font_pairing ?? defaultTheme.font_label,
      template_id: value.template_id,
      color_palette: value.color_palette ?? clonePalette(defaultTheme.palette),
    },
  });

  useEffect(() => {
    const nextTheme = getThemeByKey(value.theme_key) ?? WEDDING_THEMES[0];
    form.reset({
      theme_key: value.theme_key ?? nextTheme.key,
      font_pairing: value.font_pairing ?? nextTheme.font_label,
      template_id: value.template_id ?? null,
      color_palette: value.color_palette ?? clonePalette(nextTheme.palette),
    });
  }, [form, value]);

  useEffect(() => {
    const initialValues = form.getValues();
    onChange({
      theme_key: initialValues.theme_key ?? null,
      font_pairing: initialValues.font_pairing ?? null,
      template_id: initialValues.template_id ?? null,
      color_palette: initialValues.color_palette ? clonePalette(initialValues.color_palette) : null,
    });
  }, [form, onChange]);

  useEffect(() => {
    const subscription = form.watch(() => {
      const watchedValues = form.getValues();
      onChange({
        theme_key: watchedValues.theme_key ?? null,
        font_pairing: watchedValues.font_pairing ?? null,
        template_id: watchedValues.template_id ?? null,
        color_palette: watchedValues.color_palette ? clonePalette(watchedValues.color_palette) : null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, onChange]);

  const templates = useMemo(() => templatesQuery.data?.templates ?? [], [templatesQuery.data?.templates]);
  const selectedTemplateId = form.watch('template_id');
  const selectedThemeKey = form.watch('theme_key');
  const selectedTheme = getThemeByKey(selectedThemeKey) ?? defaultTheme;
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
  );
  const colorPalette = form.watch('color_palette') ?? clonePalette(selectedTheme.palette);

  const onTemplateClick = (template: InvitationTemplateSummary) => {
    const locked = currentPlan === 'free' && template.plan_required === 'premium';
    if (locked) {
      setUpgradeDialogOpen(true);
      return;
    }

    form.setValue('template_id', template.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const applyTheme = (themeKey: WeddingThemeKey) => {
    const theme = getThemeByKey(themeKey);
    if (!theme) {
      return;
    }

    form.setValue('theme_key', theme.key, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('font_pairing', theme.font_label, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('color_palette', clonePalette(theme.palette), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Theme &amp; Design</CardTitle>
          <CardDescription>Select a wedding theme to auto-generate colors and font style.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {WEDDING_THEMES.map((theme) => {
              const active = selectedThemeKey === theme.key;
              return (
                <button
                  key={theme.key}
                  type='button'
                  onClick={() => applyTheme(theme.key)}
                  className={cn(
                    'rounded-xl border bg-white p-3 text-left transition',
                    active ? 'border-2 border-neutral-900' : 'border-neutral-200 hover:border-neutral-400',
                  )}
                >
                  <div className='mb-2 flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold'>{theme.name}</p>
                    {active ? <Badge>Selected</Badge> : null}
                  </div>
                  <p className='text-xs text-neutral-600'>{theme.description}</p>
                  <p className='mt-2 text-xs text-neutral-500'>Font: {theme.font_label}</p>
                  <div className='mt-3 flex gap-2'>
                    <span className='h-5 w-5 rounded-full border border-neutral-300' style={{ backgroundColor: theme.palette.accent }} />
                    <span className='h-5 w-5 rounded-full border border-neutral-300' style={{ backgroundColor: theme.palette.secondary }} />
                    <span className='h-5 w-5 rounded-full border border-neutral-300' style={{ backgroundColor: theme.palette.surface }} />
                  </div>
                </button>
              );
            })}
          </div>

          {templatesQuery.isLoading ? <p className='text-sm text-neutral-600'>Loading templates...</p> : null}
          {templatesQuery.isError ? (
            <p className='text-sm text-red-700'>Unable to load templates right now. Please try again.</p>
          ) : null}

          <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {templates.map((template) => {
              const selected = template.id === selectedTemplateId;
              const locked = currentPlan === 'free' && template.plan_required === 'premium';

              return (
                <button
                  key={template.id}
                  type='button'
                  onClick={() => onTemplateClick(template)}
                  className={cn(
                    'relative overflow-hidden rounded-xl border bg-white text-left transition',
                    selected ? 'border-2 border-neutral-900' : 'border-neutral-200 hover:border-neutral-400',
                  )}
                >
                  <div className='h-28 w-full bg-neutral-100'>
                    <Image
                      src={
                        template.preview_image_path.startsWith('http')
                          ? template.preview_image_path
                          : `/${template.preview_image_path.replace(/^\/+/, '')}`
                      }
                      alt={template.name}
                      width={320}
                      height={112}
                      className='h-full w-full object-cover'
                    />
                  </div>

                  <div className='space-y-1 p-3'>
                    <p className='text-sm font-semibold'>{template.name}</p>
                    <Badge>{template.region}</Badge>
                  </div>

                  {selected ? (
                    <span className='absolute right-2 top-2 rounded-full bg-neutral-900 px-2 py-1 text-[10px] text-white'>
                      Selected
                    </span>
                  ) : null}

                  {locked ? (
                    <span className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white'>Locked</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className='space-y-2 rounded-lg border border-neutral-200 p-3'>
            <p className='text-sm font-medium'>Accent color override</p>
            <div className='flex items-center gap-2'>
              <span className='h-8 w-8 rounded-full border border-neutral-300' style={{ backgroundColor: colorPalette.accent }} />
              <input
                className='w-full max-w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm'
                placeholder='#C9A227'
                value={colorPalette.accent}
                onChange={(event) => {
                  form.setValue(
                    'color_palette',
                    {
                      ...colorPalette,
                      accent: event.target.value,
                    },
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
            </div>
            {form.formState.errors.color_palette?.accent ? (
              <p className='text-xs text-red-700'>{form.formState.errors.color_palette.accent.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Preview</CardTitle>
          <CardDescription>Auto-generated color and font tokens from the selected wedding theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className='rounded-xl border p-4'
            style={{
              backgroundColor: colorPalette.surface,
              borderColor: colorPalette.secondary,
              color: colorPalette.text,
            }}
          >
            <p className='text-sm' style={{ color: colorPalette.text }}>
              Theme
            </p>
            <p className='text-lg font-semibold'>{selectedTheme.name}</p>
            <p className='mt-2 text-sm'>Font pairing: {form.watch('font_pairing') ?? selectedTheme.font_label}</p>
            <p className='mt-3 text-sm'>Template: {selectedTemplate?.name ?? 'No template selected'}</p>

            <div className='mt-4 grid grid-cols-4 gap-2'>
              <div className='space-y-1 text-xs'>
                <span className='block h-6 w-full rounded border border-neutral-300' style={{ backgroundColor: colorPalette.accent }} />
                <p>Accent</p>
              </div>
              <div className='space-y-1 text-xs'>
                <span className='block h-6 w-full rounded border border-neutral-300' style={{ backgroundColor: colorPalette.secondary }} />
                <p>Secondary</p>
              </div>
              <div className='space-y-1 text-xs'>
                <span className='block h-6 w-full rounded border border-neutral-300' style={{ backgroundColor: colorPalette.surface }} />
                <p>Surface</p>
              </div>
              <div className='space-y-1 text-xs'>
                <span className='block h-6 w-full rounded border border-neutral-300' style={{ backgroundColor: colorPalette.text }} />
                <p>Text</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Premium</DialogTitle>
            <DialogDescription>Upgrade to Premium to unlock all templates.</DialogDescription>
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
