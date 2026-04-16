<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GuestCodeRegenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_regenerate_code_updates_invitation_and_returns_new_code(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'regenerate-code-slug',
            'guest_code' => 'X7K2P9',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/invitation/regenerate-code');

        $response->assertOk()
            ->assertJsonPath('message', 'Existing guests need new code');

        $newCode = (string) $response->json('guest_code');
        $this->assertNotSame('X7K2P9', $newCode);
        $this->assertMatchesRegularExpression('/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/', $newCode);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'guest_code' => $newCode,
        ]);
    }

    public function test_regenerate_code_is_rate_limited_to_three_per_day_per_user(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'regenerate-rate-limit',
            'guest_code' => 'A3M5Q8',
            'status' => 'draft',
        ]);

        $this->postJson('/api/v1/invitation/regenerate-code')->assertOk();
        $this->postJson('/api/v1/invitation/regenerate-code')->assertOk();
        $this->postJson('/api/v1/invitation/regenerate-code')->assertOk();
        $this->postJson('/api/v1/invitation/regenerate-code')->assertStatus(429);
    }
}
