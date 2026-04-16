<?php

namespace Tests\Feature\Admin;

use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_overview_stats(): void
    {
        $admin = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => true,
        ]);
        Sanctum::actingAs($admin);

        $userA = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $userB = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitationA = Invitation::create([
            'user_id' => $userA->id,
            'slug' => 'admin-overview-a',
            'guest_code' => 'ADMN01',
            'status' => 'published',
        ]);
        $invitationB = Invitation::create([
            'user_id' => $userB->id,
            'slug' => 'admin-overview-b',
            'guest_code' => 'ADMN02',
            'status' => 'draft',
        ]);

        Rsvp::create([
            'invitation_id' => $invitationA->id,
            'guest_name' => 'Guest One',
            'attending' => true,
            'confirmation_code' => 'OVR001',
            'guest_token_hash' => 'overview-token-1',
            'submitted_at' => now(),
        ]);
        Rsvp::create([
            'invitation_id' => $invitationA->id,
            'guest_name' => 'Guest Two',
            'attending' => false,
            'confirmation_code' => 'OVR002',
            'guest_token_hash' => 'overview-token-2',
            'submitted_at' => now(),
        ]);
        Rsvp::create([
            'invitation_id' => $invitationB->id,
            'guest_name' => 'Guest Three',
            'attending' => false,
            'confirmation_code' => 'OVR003',
            'guest_token_hash' => 'overview-token-3',
            'submitted_at' => null,
        ]);

        $response = $this->getJson('/api/v1/admin/overview');

        $response->assertOk()
            ->assertJsonPath('guests_invited', 3)
            ->assertJsonPath('rsvps_received', 2)
            ->assertJsonPath('attending', 1)
            ->assertJsonPath('declined', 1)
            ->assertJsonPath('pending', 1)
            ->assertJsonPath('invites_sent', 2)
            ->assertJsonPath('invites_opened', 1)
            ->assertJsonPath('avg_open_rate', '50.0%');
    }

    public function test_non_admin_cannot_view_overview_stats(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/admin/overview');
        $response->assertStatus(403);
    }
}
