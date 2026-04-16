<?php

namespace Tests\Feature\Admin;

use App\Jobs\SendGuestInviteEmail;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminGuestManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_guests_with_filters_and_search(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'guest-listing',
            'guest_code' => 'GSTM01',
            'status' => 'published',
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Invited Person',
            'email' => 'invited@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'GST001',
        ]);
        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Attending Person',
            'email' => 'attending@example.com',
            'guest_status' => 'contacted',
            'invited_at' => now(),
            'attending' => true,
            'submitted_at' => now(),
            'confirmation_code' => 'GST002',
        ]);

        $response = $this->getJson('/api/v1/admin/guests?status=attending&search=attending');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('guests.0.name', 'Attending Person')
            ->assertJsonPath('guests.0.status', 'attending');
    }

    public function test_admin_can_bulk_invite_via_csv_and_queue_emails(): void
    {
        Bus::fake();

        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        Invitation::create([
            'user_id' => $admin->id,
            'slug' => 'guest-bulk-invite',
            'guest_code' => 'GSTM02',
            'status' => 'draft',
        ]);

        $csv = "name,email\nAna Dela Cruz,ana@example.com\nMiguel Cruz,miguel@example.com\n";
        $file = UploadedFile::fake()->createWithContent('guests.csv', $csv);

        $response = $this->post('/api/v1/admin/guests/bulk-invite', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('added', 2)
            ->assertJsonPath('queued', 2)
            ->assertHeader('X-Guest-Usage', '2/25');

        $this->assertDatabaseHas('rsvps', [
            'email' => 'ana@example.com',
            'guest_status' => 'invited',
        ]);
        Bus::assertDispatchedTimes(SendGuestInviteEmail::class, 2);
    }

    public function test_admin_can_update_guest_status(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'guest-status',
            'guest_code' => 'GSTM03',
            'status' => 'published',
        ]);

        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Status Guest',
            'email' => 'status@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'GST003',
        ]);

        $response = $this->patchJson('/api/v1/admin/guests/' . $guest->id . '/status', [
            'status' => 'contacted',
        ]);

        $response->assertOk()->assertJsonPath('guest.guest_status', 'contacted');
        $this->assertDatabaseHas('rsvps', [
            'id' => $guest->id,
            'guest_status' => 'contacted',
        ]);
    }

    public function test_admin_can_soft_delete_guest(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'guest-delete',
            'guest_code' => 'GSTM04',
            'status' => 'published',
        ]);

        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Delete Guest',
            'email' => 'delete@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'GST004',
        ]);

        $response = $this->deleteJson('/api/v1/admin/guests/' . $guest->id);
        $response->assertNoContent();
        $this->assertSoftDeleted('rsvps', ['id' => $guest->id]);
    }

    public function test_bulk_invite_blocks_when_guest_limit_is_exceeded_for_free_plan(): void
    {
        Bus::fake();

        $admin = User::factory()->create([
            'is_admin' => true,
            'email_verified_at' => now(),
            'plan' => 'free',
        ]);
        Sanctum::actingAs($admin);

        $invitation = Invitation::create([
            'user_id' => $admin->id,
            'slug' => 'guest-free-limit',
            'guest_code' => 'GSTM05',
            'status' => 'draft',
        ]);

        for ($index = 1; $index <= 25; $index++) {
            Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => "Guest {$index}",
                'email' => "guest{$index}@example.com",
                'guest_status' => 'invited',
                'invited_at' => now(),
                'attending' => false,
                'confirmation_code' => sprintf('LMT%03d', $index),
            ]);
        }

        $csv = "name,email\nExtra Guest,extra@example.com\n";
        $file = UploadedFile::fake()->createWithContent('guests.csv', $csv);

        $response = $this->post('/api/v1/admin/guests/bulk-invite', [
            'file' => $file,
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'message' => 'Guest limit reached. Upgrade to add more guests.',
            ])
            ->assertHeader('X-Guest-Usage', '25/25');

        Bus::assertNothingDispatched();
    }
}
