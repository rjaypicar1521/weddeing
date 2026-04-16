<?php

namespace Tests\Feature\Admin;

use App\Models\AdminReminder;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminInviteAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_invite_analytics_summary(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'analytics-invites',
            'guest_code' => 'ANL001',
            'status' => 'published',
        ]);

        $rsvpA = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest A',
            'email' => 'a@example.com',
            'guest_status' => 'invited',
            'attending' => false,
            'confirmation_code' => 'ANLRS1',
        ]);
        $rsvpB = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest B',
            'email' => 'b@example.com',
            'guest_status' => 'invited',
            'attending' => false,
            'confirmation_code' => 'ANLRS2',
        ]);
        $rsvpC = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest C',
            'email' => 'c@example.com',
            'guest_status' => 'invited',
            'attending' => false,
            'confirmation_code' => 'ANLRS3',
        ]);

        AdminReminder::create([
            'invitation_id' => $invitation->id,
            'rsvp_id' => $rsvpA->id,
            'sent_by_user_id' => $admin->id,
            'recipient_email' => 'a@example.com',
            'status' => 'sent',
            'sent_at' => now()->subDays(3),
            'opened_at' => now()->subDays(1),
            'open_device' => 'mobile',
        ]);
        AdminReminder::create([
            'invitation_id' => $invitation->id,
            'rsvp_id' => $rsvpB->id,
            'sent_by_user_id' => $admin->id,
            'recipient_email' => 'b@example.com',
            'status' => 'sent',
            'sent_at' => now()->subDays(2),
            'opened_at' => now(),
            'open_device' => 'desktop',
        ]);
        AdminReminder::create([
            'invitation_id' => $invitation->id,
            'rsvp_id' => $rsvpC->id,
            'sent_by_user_id' => $admin->id,
            'recipient_email' => 'c@example.com',
            'status' => 'sent',
            'sent_at' => now()->subDays(1),
            'opened_at' => null,
            'open_device' => null,
        ]);

        $response = $this->getJson('/api/v1/admin/analytics/invites');

        $response->assertOk()
            ->assertJsonPath('total_sent', 3)
            ->assertJsonPath('total_opened', 2)
            ->assertJsonPath('open_rate', 66.7)
            ->assertJsonPath('opened_today', 1)
            ->assertJsonPath('by_device.mobile', 1)
            ->assertJsonPath('by_device.desktop', 1)
            ->assertJsonPath('range_days', 7);

        $timeline = $response->json('timeline');
        $this->assertCount(7, $timeline);
    }

    public function test_analytics_supports_30_day_range_and_requires_admin(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/analytics/invites?range=30');
        $response->assertOk()->assertJsonPath('range_days', 30);

        $nonAdmin = User::factory()->create([
            'is_admin' => false,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($nonAdmin);

        $forbidden = $this->getJson('/api/v1/admin/analytics/invites');
        $forbidden->assertStatus(403);
    }
}
