<?php

namespace Tests\Feature\Couple;

use App\Jobs\SendGuestInviteEmail;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GuestManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_couple_can_list_only_their_guests(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'couple-guests',
            'guest_code' => 'CPG001',
            'status' => 'draft',
        ]);

        $otherUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $otherInvitation = Invitation::create([
            'user_id' => $otherUser->id,
            'slug' => 'other-guests',
            'guest_code' => 'CPG002',
            'status' => 'draft',
        ]);

        Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Ana Couple',
            'email' => 'ana@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'CG001A',
        ]);

        Rsvp::create([
            'invitation_id' => $otherInvitation->id,
            'guest_name' => 'Not Mine',
            'email' => 'other@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'CG001B',
        ]);

        $response = $this->getJson('/api/v1/guests?search=ana');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('guests.0.name', 'Ana Couple');
    }

    public function test_couple_can_bulk_invite_guests_via_csv(): void
    {
        Bus::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'couple-bulk-guests',
            'guest_code' => 'CPG003',
            'status' => 'draft',
        ]);

        $csv = "group_name,name,email\nSantos Family,Pat Guest,pat@example.com\nBride Team,Chris Guest,chris@example.com\n";
        $file = UploadedFile::fake()->createWithContent('guests.csv', $csv);

        $response = $this->post('/api/v1/guests/bulk-invite', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('added', 2)
            ->assertJsonPath('queued', 2)
            ->assertHeader('X-Guest-Usage', '2/25');

        $this->assertDatabaseHas('rsvps', [
            'email' => 'pat@example.com',
            'guest_status' => 'invited',
        ]);
        $this->assertDatabaseHas('guest_groups', [
            'invitation_id' => $user->invitation->id,
            'name' => 'Santos Family',
        ]);
        Bus::assertDispatchedTimes(SendGuestInviteEmail::class, 2);
    }

    public function test_send_guest_invite_email_job_tolerates_mail_delivery_failures(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'couple-bulk-guests-mail-failure',
            'guest_code' => 'CPG005',
            'status' => 'draft',
        ]);

        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Morgan Guest',
            'email' => 'morgan@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'CG005A',
        ]);

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
            'mail.mailers.smtp.encryption' => null,
            'mail.mailers.smtp.username' => null,
            'mail.mailers.smtp.password' => null,
            'mail.mailers.smtp.timeout' => 1,
        ]);

        $job = new SendGuestInviteEmail($guest->id);

        $job->handle();

        $this->assertDatabaseHas('rsvps', [
            'id' => $guest->id,
            'email' => 'morgan@example.com',
            'guest_status' => 'invited',
        ]);
    }

    public function test_couple_can_update_status_and_delete_their_guest(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'couple-update-guest',
            'guest_code' => 'CPG004',
            'status' => 'draft',
        ]);

        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Delete Me',
            'email' => 'delete-me@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'CG004A',
        ]);

        $this->patchJson('/api/v1/guests/' . $guest->id . '/status', [
            'status' => 'contacted',
        ])->assertOk()->assertJsonPath('guest.guest_status', 'contacted');

        $this->deleteJson('/api/v1/guests/' . $guest->id)->assertNoContent();
        $this->assertSoftDeleted('rsvps', ['id' => $guest->id]);
    }

    public function test_couple_can_create_rename_and_regenerate_guest_groups(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'couple-group-management',
            'guest_code' => 'CPG006',
            'status' => 'draft',
        ]);

        $createResponse = $this->postJson('/api/v1/guest-groups', [
            'name' => 'Bride Team',
        ]);

        $groupId = (int) $createResponse->json('group.id');
        $originalCode = (string) $createResponse->json('group.access_code');

        $createResponse->assertCreated()
            ->assertJsonPath('group.name', 'Bride Team');

        $this->patchJson('/api/v1/guest-groups/' . $groupId, [
            'name' => 'Bride Squad',
        ])->assertOk()
            ->assertJsonPath('group.name', 'Bride Squad');

        $regenerateResponse = $this->postJson('/api/v1/guest-groups/' . $groupId . '/regenerate-code');

        $regenerateResponse->assertOk();
        $this->assertNotSame($originalCode, (string) $regenerateResponse->json('group.access_code'));

        $listResponse = $this->getJson('/api/v1/guest-groups');

        $listResponse->assertOk()
            ->assertJsonPath('groups.0.name', 'General Guests');

        $this->assertDatabaseHas('guest_groups', [
            'invitation_id' => $invitation->id,
            'name' => 'Bride Squad',
        ]);
    }

    public function test_couple_can_create_default_table_codes_for_a_200_pax_setup(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'premium',
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'table-code-setup',
            'guest_code' => 'TBL200',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/guest-groups/table-codes');

        $response->assertOk()
            ->assertJsonPath('created_count', 20)
            ->assertJsonPath('existing_count', 0);

        $groups = $response->json('groups');
        $this->assertIsArray($groups);
        $this->assertCount(21, $groups);

        $tableNames = collect($groups)
            ->pluck('name')
            ->filter(fn (string $name): bool => str_starts_with($name, 'Table '))
            ->values()
            ->all();

        $this->assertCount(20, $tableNames);
        $this->assertSame('Table 01', $tableNames[0]);
        $this->assertSame('Table 20', $tableNames[19]);

        $tableCodes = collect($groups)
            ->filter(fn (array $group): bool => str_starts_with((string) $group['name'], 'Table '))
            ->pluck('access_code')
            ->all();

        $this->assertCount(20, array_unique($tableCodes));
    }

    public function test_couple_can_move_a_guest_between_table_groups(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'premium',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'table-move-guest',
            'guest_code' => 'TBL201',
            'status' => 'draft',
        ]);

        $tableOne = $invitation->guestGroups()->create([
            'name' => 'Table 01',
            'access_code' => 'TAB001',
            'status' => 'active',
            'is_default' => false,
        ]);

        $tableTwo = $invitation->guestGroups()->create([
            'name' => 'Table 02',
            'access_code' => 'TAB002',
            'status' => 'active',
            'is_default' => false,
        ]);

        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_group_id' => $tableOne->id,
            'guest_name' => 'Transferred Guest',
            'email' => 'transfer@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'CG007A',
        ]);

        $this->patchJson('/api/v1/guests/' . $guest->id . '/group', [
            'guest_group_id' => $tableTwo->id,
        ])->assertOk()
            ->assertJsonPath('guest.guest_group_id', $tableTwo->id)
            ->assertJsonPath('guest.group_name', 'Table 02');

        $this->assertDatabaseHas('rsvps', [
            'id' => $guest->id,
            'guest_group_id' => $tableTwo->id,
        ]);
    }
}
