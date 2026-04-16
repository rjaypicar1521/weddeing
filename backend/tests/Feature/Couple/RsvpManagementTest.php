<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\RsvpAudit;
use App\Models\RsvpNote;
use App\Models\User;
use App\Jobs\ProcessRsvpNotificationEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RsvpManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_rsvp_index_filters_and_searches_with_pagination(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-couple',
            'guest_code' => 'RSVP01',
            'status' => 'published',
        ]);

        for ($index = 0; $index < 23; $index++) {
            Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => $index === 0 ? 'Ana Dela Cruz' : 'Guest ' . $index,
                'attending' => $index % 2 === 0,
                'plus_one_name' => $index % 3 === 0 ? 'Plus One ' . $index : null,
                'meal_preference' => $index % 2 === 0 ? 'Beef' : 'Fish',
                'transport' => $index % 2 === 0 ? 'has_car' : 'needs_shuttle',
                'favorite_memory' => 'Memory ' . $index,
                'message_to_couple' => 'Message ' . $index,
                'confirmation_code' => 'C' . str_pad((string) $index, 5, '0', STR_PAD_LEFT),
                'guest_token_hash' => 'token-' . $index,
                'ip_address' => '127.0.0.' . ($index + 1),
                'submitted_at' => now()->subMinutes($index),
            ]);
        }

        $allResponse = $this->getJson('/api/v1/rsvps');
        $allResponse->assertOk()
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 23)
            ->assertJsonCount(20, 'rsvps');

        $attendingResponse = $this->getJson('/api/v1/rsvps?status=attending');
        $attendingResponse->assertOk()
            ->assertJsonPath('meta.total', 12);

        $searchResponse = $this->getJson('/api/v1/rsvps?search=ana');
        $searchResponse->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('rsvps.0.guest_name', 'Ana Dela Cruz');
    }

    public function test_rsvp_stats_returns_aggregates(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-stats',
            'guest_code' => 'RSVP02',
            'status' => 'published',
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest One',
            'attending' => true,
            'plus_one_name' => 'Plus Guest',
            'meal_preference' => 'Beef',
            'transport' => 'has_car',
            'confirmation_code' => 'STAT01',
            'guest_token_hash' => 'stats-token-1',
            'ip_address' => '127.0.0.1',
            'submitted_at' => now()->subMinutes(3),
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest Two',
            'attending' => false,
            'meal_preference' => null,
            'transport' => 'needs_shuttle',
            'confirmation_code' => 'STAT02',
            'guest_token_hash' => 'stats-token-2',
            'ip_address' => '127.0.0.2',
            'submitted_at' => now()->subMinutes(2),
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Guest Three',
            'attending' => false,
            'meal_preference' => 'Fish',
            'transport' => 'needs_shuttle',
            'confirmation_code' => 'STAT03',
            'guest_token_hash' => 'stats-token-3',
            'ip_address' => '127.0.0.3',
            'submitted_at' => null,
        ]);

        $response = $this->getJson('/api/v1/rsvps/stats');

        $response->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('attending', 1)
            ->assertJsonPath('declined', 1)
            ->assertJsonPath('pending', 1)
            ->assertJsonPath('total_with_plus_ones', 2)
            ->assertJsonPath('meal_counts.Beef', 1)
            ->assertJsonPath('meal_counts.Fish', 1)
            ->assertJsonPath('transport_counts.has_car', 1)
            ->assertJsonPath('transport_counts.needs_shuttle', 2);
    }

    public function test_rsvp_export_downloads_csv_with_utf8_bom(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-export',
            'guest_code' => 'RSVP03',
            'status' => 'published',
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Ana Dela Cruz',
            'attending' => true,
            'plus_one_name' => 'Miguel Cruz',
            'meal_preference' => 'Fish',
            'transport' => 'has_car',
            'favorite_memory' => 'College days',
            'message_to_couple' => 'Congrats!',
            'confirmation_code' => 'EXP001',
            'guest_token_hash' => 'export-token-1',
            'ip_address' => '127.0.0.1',
            'submitted_at' => now(),
        ]);

        $response = $this->get('/api/v1/rsvps/export');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('content-disposition');

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('"Guest Name",Attending,"+1 Name","Meal Preference",Transport,"Favorite Memory",Message,"Date Submitted"', $content);
        $this->assertStringContainsString('"Ana Dela Cruz",Yes,"Miguel Cruz",Fish,has_car,"College days",Congrats!', $content);
    }

    public function test_rsvp_export_can_filter_attending_only_and_is_rate_limited(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-export-filter',
            'guest_code' => 'RSVP04',
            'status' => 'published',
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Attending Guest',
            'attending' => true,
            'confirmation_code' => 'EXP101',
            'guest_token_hash' => 'export-token-a',
            'ip_address' => '127.0.0.2',
            'submitted_at' => now(),
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Declined Guest',
            'attending' => false,
            'confirmation_code' => 'EXP102',
            'guest_token_hash' => 'export-token-b',
            'ip_address' => '127.0.0.3',
            'submitted_at' => now(),
        ]);

        $first = $this->get('/api/v1/rsvps/export?only_attending=1');
        $first->assertOk();

        $content = $first->streamedContent();
        $this->assertStringContainsString('Attending Guest', $content);
        $this->assertStringNotContainsString('Declined Guest', $content);

        $second = $this->get('/api/v1/rsvps/export?only_attending=1');
        $second->assertStatus(429);
    }

    public function test_couple_can_patch_rsvp_and_sets_manual_override_and_audit(): void
    {
        Bus::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-patch-couple',
            'guest_code' => 'RSVP05',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Edited Guest',
            'attending' => false,
            'meal_preference' => 'Fish',
            'transport' => 'needs_shuttle',
            'favorite_memory' => 'Old memory',
            'message_to_couple' => 'Old message',
            'confirmation_code' => 'MAN001',
            'guest_token_hash' => 'manual-token-1',
            'ip_address' => '127.0.0.20',
            'submitted_at' => now(),
        ]);

        $response = $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'attending' => true,
            'plus_one_name' => 'Partner Guest',
            'meal_preference' => 'Beef',
            'transport' => 'has_car',
            'favorite_memory' => 'New memory',
            'message_to_couple' => 'Updated message',
        ]);

        $response->assertOk()
            ->assertJsonPath('rsvp.attending', true)
            ->assertJsonPath('rsvp.plus_one_name', 'Partner Guest')
            ->assertJsonPath('rsvp.meal_preference', 'Beef')
            ->assertJsonPath('rsvp.transport', 'has_car')
            ->assertJsonPath('rsvp.message_to_couple', 'Updated message')
            ->assertJsonPath('notification_sent', true);

        $this->assertDatabaseHas('rsvps', [
            'id' => $rsvp->id,
            'attending' => true,
            'manually_overridden_by' => $user->id,
        ]);

        $this->assertSame(1, RsvpAudit::query()->where('rsvp_id', $rsvp->id)->count());
        Bus::assertDispatched(ProcessRsvpNotificationEmail::class);
    }

    public function test_admin_can_patch_rsvp_from_other_invitation(): void
    {
        $admin = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => true,
        ]);
        Sanctum::actingAs($admin);

        $owner = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);

        $invitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'rsvp-admin-edit',
            'guest_code' => 'RSVP06',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Cross Invitation',
            'attending' => false,
            'confirmation_code' => 'MAN002',
            'guest_token_hash' => 'manual-token-2',
            'ip_address' => '127.0.0.21',
            'submitted_at' => now(),
        ]);

        $response = $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'attending' => true,
        ]);

        $response->assertOk()->assertJsonPath('rsvp.attending', true);
    }

    public function test_non_admin_cannot_patch_rsvp_from_other_invitation(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-own-inv',
            'guest_code' => 'RSVP07',
            'status' => 'published',
        ]);

        $otherUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $otherInvitation = Invitation::create([
            'user_id' => $otherUser->id,
            'slug' => 'rsvp-other-inv',
            'guest_code' => 'RSVP08',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $otherInvitation->id,
            'guest_name' => 'Forbidden Edit',
            'attending' => false,
            'confirmation_code' => 'MAN003',
            'guest_token_hash' => 'manual-token-3',
            'ip_address' => '127.0.0.22',
            'submitted_at' => now(),
        ]);

        $response = $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'attending' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_can_add_private_note_to_rsvp(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-note-couple',
            'guest_code' => 'RSVP09',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Note Guest',
            'attending' => true,
            'confirmation_code' => 'MAN004',
            'guest_token_hash' => 'manual-token-4',
            'ip_address' => '127.0.0.23',
            'submitted_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/rsvps/' . $rsvp->id . '/note', [
            'note' => 'Family requested front-row seating.',
        ]);

        $response->assertOk()
            ->assertJsonPath('notes.0.note', 'Family requested front-row seating.');

        $this->assertSame(1, RsvpNote::query()->where('rsvp_id', $rsvp->id)->count());
    }

    public function test_patch_rsvp_validates_payload(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-validation-couple',
            'guest_code' => 'RSVP10',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Validation Guest',
            'attending' => true,
            'confirmation_code' => 'MAN005',
            'guest_token_hash' => 'manual-token-5',
            'ip_address' => '127.0.0.24',
            'submitted_at' => now(),
        ]);

        $response = $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'transport' => 'invalid_transport',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['transport']);
    }

    public function test_patch_without_actual_changes_does_not_send_notification(): void
    {
        Bus::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-no-change',
            'guest_code' => 'RSVP11',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'No Change Guest',
            'attending' => true,
            'meal_preference' => 'Fish',
            'transport' => 'has_car',
            'confirmation_code' => 'MAN006',
            'guest_token_hash' => 'manual-token-6',
            'ip_address' => '127.0.0.25',
            'submitted_at' => now(),
        ]);

        $response = $this->patchJson('/api/v1/rsvps/' . $rsvp->id, [
            'attending' => true,
            'meal_preference' => 'Fish',
            'transport' => 'has_car',
        ]);

        $response->assertOk()->assertJsonPath('notification_sent', false);
        Bus::assertNotDispatched(ProcessRsvpNotificationEmail::class);
    }
}
