<?php

namespace Tests\Feature\Couple;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ThemeDesignTest extends TestCase
{
    use RefreshDatabase;

    public function test_templates_endpoint_returns_only_active_templates(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        DB::table('invitation_templates')->insert([
            [
                'name' => 'Filipino Classic',
                'slug' => 'filipino-classic',
                'preview_image_path' => 'templates/filipino-classic/preview.webp',
                'plan_required' => 'free',
                'region' => 'Filipino',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Hidden Template',
                'slug' => 'hidden-template',
                'preview_image_path' => 'templates/hidden-template/preview.webp',
                'plan_required' => 'premium',
                'region' => 'Western',
                'is_active' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $response = $this->getJson('/api/v1/templates');

        $response->assertOk()
            ->assertJsonCount(1, 'templates')
            ->assertJsonPath('templates.0.slug', 'filipino-classic')
            ->assertJsonMissingPath('templates.1');
    }

    public function test_free_user_cannot_select_premium_template(): void
    {
        $user = User::factory()->create([
            'plan' => 'free',
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $templateId = DB::table('invitation_templates')->insertGetId([
            'name' => 'Western Elegance',
            'slug' => 'western-elegance',
            'preview_image_path' => 'templates/western-elegance/preview.webp',
            'plan_required' => 'premium',
            'region' => 'Western',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'template_id' => $templateId,
        ])
            ->assertForbidden()
            ->assertJson([
                'message' => 'Upgrade to Premium to use this template',
            ]);
    }

    public function test_invitation_update_saves_template_and_color_palette_for_free_template(): void
    {
        $user = User::factory()->create([
            'plan' => 'free',
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $templateId = DB::table('invitation_templates')->insertGetId([
            'name' => 'Filipino Classic',
            'slug' => 'filipino-classic',
            'preview_image_path' => 'templates/filipino-classic/preview.webp',
            'plan_required' => 'free',
            'region' => 'Filipino',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'template_id' => $templateId,
            'color_palette' => [
                'accent' => '#C4A484',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('invitation.template_id', $templateId)
            ->assertJsonPath('invitation.color_palette.accent', '#C4A484');
    }
}

