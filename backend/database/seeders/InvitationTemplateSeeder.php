<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvitationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $templates = [
            [
                'name' => 'Filipino Classic',
                'slug' => 'filipino-classic',
                'preview_image_path' => 'templates/filipino-classic/preview.webp',
                'plan_required' => 'free',
                'region' => 'Filipino',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Western Elegance',
                'slug' => 'western-elegance',
                'preview_image_path' => 'templates/western-elegance/preview.webp',
                'plan_required' => 'premium',
                'region' => 'Western',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Boho Garden',
                'slug' => 'boho-garden',
                'preview_image_path' => 'templates/boho-garden/preview.webp',
                'plan_required' => 'premium',
                'region' => 'Boho',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Korean Minimal',
                'slug' => 'korean-minimal',
                'preview_image_path' => 'templates/korean-minimal/preview.webp',
                'plan_required' => 'premium',
                'region' => 'Korean',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        $targetSlugs = array_map(
            static fn (array $template): string => $template['slug'],
            $templates
        );

        DB::table('invitation_templates')
            ->whereNotIn('slug', $targetSlugs)
            ->delete();

        DB::table('invitation_templates')->upsert(
            $templates,
            ['slug'],
            ['name', 'preview_image_path', 'plan_required', 'region', 'is_active', 'updated_at']
        );
    }
}
