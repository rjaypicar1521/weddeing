<?php

namespace Tests\Feature\Guest;

use App\Models\Invitation;
use App\Models\InvitationTemplate;
use App\Models\LoveStoryChapter;
use App\Models\MediaFile;
use App\Models\GuestGroup;
use App\Models\User;
use App\Models\Wish;
use App\Services\GuestTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GuestCodeValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_validate_code_returns_guest_token_and_slug_for_published_invitation(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'andrea-miguel',
            'guest_code' => 'X7K2P9',
            'status' => 'published',
        ]);

        $response = $this->postJson('/api/v1/guest/validate-code', [
            'code' => 'X7-K2-P9',
        ]);

        $response->assertOk()
            ->assertJsonPath('invitation_slug', 'andrea-miguel')
            ->assertJsonPath('group.name', 'General Guests');

        $guestToken = (string) $response->json('guest_token');
        $this->assertNotSame('', $guestToken);
        $this->assertCount(3, explode('.', $guestToken));
    }

    public function test_validate_code_returns_not_found_for_invalid_code(): void
    {
        $response = $this->postJson('/api/v1/guest/validate-code', [
            'code' => 'A1B2C3',
        ]);

        $response->assertNotFound()
            ->assertJson([
                'message' => "Code doesn't match. Check your invitation.",
            ]);
    }

    public function test_validate_code_returns_not_found_for_unpublished_invitation(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'pending-invite',
            'guest_code' => 'A3M5Q8',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/guest/validate-code', [
            'code' => 'A3M5Q8',
        ]);

        $response->assertNotFound()
            ->assertJson([
                'message' => "This invitation isn't available yet. Contact the couple.",
            ]);
    }

    public function test_guest_can_fetch_published_invitation_payload(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $template = InvitationTemplate::create([
            'name' => 'Filipiniana',
            'slug' => 'filipiniana',
            'preview_image_path' => 'templates/filipiniana.webp',
            'plan_required' => 'free',
            'region' => 'NCR',
            'is_active' => true,
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'template_id' => $template->id,
            'slug' => 'andrea-miguel',
            'guest_code' => 'X7K2P9',
            'status' => 'published',
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'venue_name' => 'Manila Cathedral',
        ]);

        LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'How We Met',
            'story_text' => 'At a cafe in Makati.',
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

        Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Paolo',
            'message' => 'See you there!',
            'is_flagged' => false,
        ]);

        $group = GuestGroup::query()->create([
            'invitation_id' => $invitation->id,
            'name' => 'Santos Family',
            'access_code' => 'SFM246',
            'status' => 'active',
            'is_default' => false,
        ]);

        $token = app(GuestTokenService::class)->issueToken($invitation, $group);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/guest/invitation');

        $response->assertOk()
            ->assertJsonPath('invitation.slug', 'andrea-miguel')
            ->assertJsonPath('template.slug', 'filipiniana')
            ->assertJsonPath('love_story_chapters.0.title', 'How We Met')
            ->assertJsonPath('media.hero.0.type', 'hero')
            ->assertJsonPath('wishes.0.guest_name', 'Paolo')
            ->assertJsonPath('group.name', 'Santos Family');
    }
}
