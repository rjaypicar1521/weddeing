<?php

namespace Tests\Feature\Admin;

use App\Jobs\SendRsvpReminder;
use App\Models\AdminReminder;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_bulk_queue_pending_reminders_and_skip_invalid_email_rows(): void
    {
        Bus::fake();

        $admin = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => true,
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'reminder-bulk',
            'guest_code' => 'RMD001',
            'status' => 'published',
        ]);

        $pendingWithEmail = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'pending@example.com',
            'attending' => false,
            'confirmation_code' => 'RMDP01',
            'guest_token_hash' => 'reminder-pending-1',
            'submitted_at' => null,
        ]);
        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'No Email Guest',
            'attending' => false,
            'confirmation_code' => 'RMDP02',
            'guest_token_hash' => 'reminder-pending-2',
            'submitted_at' => null,
        ]);
        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'attending@example.com',
            'attending' => true,
            'confirmation_code' => 'RMDP03',
            'guest_token_hash' => 'reminder-pending-3',
            'submitted_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/admin/reminders/pending');
        $response->assertOk()
            ->assertJsonPath('queued', 1)
            ->assertJsonPath('skipped', 1)
            ->assertJsonPath('total_pending', 2);

        Bus::assertDispatchedTimes(SendRsvpReminder::class, 1);
        Bus::assertDispatched(SendRsvpReminder::class);

        $this->assertDatabaseHas('admin_reminders', [
            'rsvp_id' => $pendingWithEmail->id,
            'status' => 'queued',
        ]);
        $this->assertDatabaseHas('admin_reminders', [
            'status' => 'skipped',
        ]);
    }

    public function test_bulk_reminder_endpoint_is_rate_limited_to_once_per_hour(): void
    {
        $admin = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => true,
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'reminder-rate-limit',
            'guest_code' => 'RMD002',
            'status' => 'published',
        ]);
        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'pending2@example.com',
            'attending' => false,
            'confirmation_code' => 'RMDP04',
            'guest_token_hash' => 'reminder-pending-4',
            'submitted_at' => null,
        ]);

        $first = $this->postJson('/api/v1/admin/reminders/pending');
        $first->assertOk();

        $second = $this->postJson('/api/v1/admin/reminders/pending');
        $second->assertStatus(429);
    }

    public function test_admin_can_send_single_reminder_and_read_stats(): void
    {
        Bus::fake();

        $admin = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => true,
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'reminder-single',
            'guest_code' => 'RMD003',
            'status' => 'published',
        ]);
        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'single@example.com',
            'attending' => false,
            'confirmation_code' => 'RMDP05',
            'guest_token_hash' => 'reminder-pending-5',
            'submitted_at' => null,
        ]);

        $sendResponse = $this->postJson('/api/v1/admin/reminders/' . $rsvp->id);
        $sendResponse->assertOk()
            ->assertJsonPath('queued', true)
            ->assertJsonPath('guest_name', 'single@example.com');

        Bus::assertDispatched(SendRsvpReminder::class);

        AdminReminder::query()->where('rsvp_id', $rsvp->id)->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $statsResponse = $this->getJson('/api/v1/admin/reminders/stats');
        $statsResponse->assertOk()
            ->assertJsonPath('last_24h.total', 1)
            ->assertJsonPath('last_24h.sent', 1)
            ->assertJsonPath('tracking.open_click_tracking_supported', false);
    }

    public function test_non_admin_cannot_access_admin_reminder_endpoints(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/admin/reminders/pending');
        $response->assertStatus(403);
    }
}
