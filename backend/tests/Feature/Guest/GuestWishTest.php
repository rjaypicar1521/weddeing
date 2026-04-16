<?php

namespace Tests\Feature\Guest;

use App\Models\Invitation;
use App\Models\User;
use App\Models\Wish;
use App\Services\GuestTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestWishTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_list_only_unflagged_wishes_newest_first(): void
    {
        [$token, $invitation] = $this->createGuestToken();

        $olderWish = Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Older',
            'message' => 'First wish',
            'is_flagged' => false,
        ]);
        $olderWish->forceFill([
            'created_at' => now()->subMinutes(10),
            'updated_at' => now()->subMinutes(10),
        ])->save();

        Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Flagged',
            'message' => 'Should be hidden',
            'is_flagged' => true,
        ]);

        $newWish = Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Newest',
            'message' => 'Latest wish',
            'is_flagged' => false,
        ]);
        $newWish->forceFill([
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ])->save();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/guest/wishes?per_page=10');

        $response->assertOk()
            ->assertJsonPath('wishes.0.id', $newWish->id)
            ->assertJsonPath('wishes.1.id', $olderWish->id)
            ->assertJsonCount(2, 'wishes');
    }

    public function test_guest_can_create_wish_and_validation_applies(): void
    {
        [$token, $invitation] = $this->createGuestToken();

        $created = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/wishes', [
                'guest_name' => 'Ana Reyes',
                'message' => 'Congratulations and best wishes!',
            ]);

        $created->assertCreated()
            ->assertJsonPath('wish.guest_name', 'Ana Reyes');

        $this->assertDatabaseHas('wishes', [
            'invitation_id' => $invitation->id,
            'guest_name' => 'Ana Reyes',
            'is_flagged' => false,
        ]);

        $invalid = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/wishes', [
                'guest_name' => '',
                'message' => str_repeat('a', 501),
            ]);

        $invalid->assertStatus(422)
            ->assertJsonValidationErrors(['guest_name', 'message']);
    }

    public function test_guest_can_flag_wish_and_rate_limit_is_applied(): void
    {
        [$token, $invitation] = $this->createGuestToken();

        $wish = Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest',
            'message' => 'Please review',
            'is_flagged' => false,
        ]);

        $flagResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/guest/wishes/{$wish->id}/flag");

        $flagResponse->assertOk()
            ->assertJsonPath('wish.is_flagged', true);

        $this->assertDatabaseHas('wishes', [
            'id' => $wish->id,
            'is_flagged' => true,
        ]);

        for ($index = 0; $index < 9; $index++) {
            $extraWish = Wish::create([
                'invitation_id' => $invitation->id,
                'guest_name' => 'Guest ' . $index,
                'message' => 'Wish ' . $index,
                'is_flagged' => false,
            ]);

            $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/v1/guest/wishes/{$extraWish->id}/flag")
                ->assertOk();
        }

        $rateLimitedWish = Wish::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest final',
            'message' => 'Wish final',
            'is_flagged' => false,
        ]);

        $rateLimited = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/guest/wishes/{$rateLimitedWish->id}/flag");

        $rateLimited->assertStatus(429);
    }

    /**
     * @return array{0: string, 1: Invitation}
     */
    private function createGuestToken(): array
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'wishes-token',
            'guest_code' => 'A3M5Q8',
            'status' => 'published',
        ]);

        $token = app(GuestTokenService::class)->issueToken($invitation);

        return [$token, $invitation];
    }
}
