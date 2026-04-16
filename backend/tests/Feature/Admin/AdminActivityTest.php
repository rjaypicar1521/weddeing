<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_activity_with_filters_and_search(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        ActivityLog::create([
            'user_name' => 'John Smith',
            'action' => 'rsvp_submitted',
            'category' => 'rsvps',
            'details' => 'Attending + Sarah',
            'ip' => '123.45.67.89',
        ]);
        ActivityLog::create([
            'user_name' => 'System',
            'action' => 'reminder_sent',
            'category' => 'reminders',
            'details' => '15 reminders sent to pending guests',
            'ip' => null,
        ]);

        $response = $this->getJson('/api/v1/admin/activity?type=rsvps&search=john');
        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.action', 'rsvp_submitted')
            ->assertJsonPath('data.0.user_name', 'John Smith');
    }

    public function test_key_events_are_logged_in_activity_stream(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        Invitation::create([
            'user_id' => $admin->id,
            'slug' => 'activity-admin-invite',
            'guest_code' => 'ACT001',
            'status' => 'published',
        ]);

        $csv = "name,email\nAna Dela Cruz,ana@example.com\n";
        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('guests.csv', $csv);
        $this->post('/api/v1/admin/guests/bulk-invite', ['file' => $file])->assertOk();

        $guest = Rsvp::query()->where('email', 'ana@example.com')->firstOrFail();
        $this->deleteJson('/api/v1/admin/guests/' . $guest->id)->assertNoContent();

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'activity-rsvp',
            'guest_code' => 'ACT002',
            'status' => 'published',
        ]);
        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Updated Guest',
            'attending' => false,
            'confirmation_code' => 'ACTR01',
            'submitted_at' => now(),
        ]);

        $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'attending' => true,
            'meal_preference' => 'Fish',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', ['action' => 'guest_added']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'guest_deleted']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'rsvp_updated']);
    }
}
