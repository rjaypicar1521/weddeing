<?php

namespace Tests\Feature\Couple;

use App\Models\EntourageMember;
use App\Models\Invitation;
use App\Models\LoveStoryChapter;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvitationPublishPreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_publish_sets_published_status_and_timestamp(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'publish-preview-slug',
            'guest_code' => 'PBL123',
            'status' => 'draft',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/invitation/publish');

        $response->assertOk()
            ->assertJsonPath('invitation.status', 'published')
            ->assertJsonPath('invitation.slug', 'publish-preview-slug');

        $invitation->refresh();
        $this->assertSame('published', $invitation->status);
        $this->assertNotNull($invitation->published_at);
    }

    public function test_unpublish_sets_draft_status_and_clears_published_timestamp(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'unpublish-preview-slug',
            'guest_code' => 'UPB123',
            'status' => 'published',
            'published_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/invitation/unpublish');

        $response->assertOk()
            ->assertJsonPath('invitation.status', 'draft');

        $invitation->refresh();
        $this->assertSame('draft', $invitation->status);
        $this->assertNull($invitation->published_at);
    }

    public function test_preview_returns_full_invitation_payload_with_preview_mode_flag(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'preview-full-payload',
            'guest_code' => 'PVW123',
            'status' => 'draft',
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(90)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'schedule' => [
                ['time' => '14:00', 'event' => 'Ceremony', 'description' => 'Main hall'],
            ],
        ]);

        LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'How We Met',
            'story_text' => 'At a cafe in Makati.',
            'sort_order' => 1,
        ]);

        EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'Ninong Carlo',
            'role' => 'ninong',
            'sort_order' => 1,
        ]);

        MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'hero',
            'file_path' => 'users/' . $user->id . '/hero/hero.webp',
            'file_name' => 'hero.webp',
            'file_size_bytes' => 1024,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);

        Storage::fake('r2');

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/invitation/preview');

        $response->assertOk()
            ->assertJsonPath('preview_mode', true)
            ->assertJsonPath('invitation.slug', 'preview-full-payload')
            ->assertJsonPath('love_story_chapters.0.title', 'How We Met')
            ->assertJsonPath('entourage_members.0.name', 'Ninong Carlo')
            ->assertJsonPath('media.hero.0.type', 'hero');
    }
}
