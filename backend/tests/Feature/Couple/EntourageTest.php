<?php

namespace Tests\Feature\Couple;

use App\Models\EntourageMember;
use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EntourageTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_returns_ordered_entourage_members(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'entourage-list-slug',
            'guest_code' => 'ENL123',
            'status' => 'draft',
        ]);

        EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'Ninong Mark',
            'role' => 'ninong',
            'sort_order' => 2,
        ]);
        EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'Ninang Grace',
            'role' => 'ninang',
            'sort_order' => 0,
        ]);

        $this->getJson('/api/v1/entourage')
            ->assertOk()
            ->assertJsonPath('members.0.name', 'Ninang Grace')
            ->assertJsonPath('members.1.name', 'Ninong Mark');
    }

    public function test_create_member_and_limit_maximum_to_fifty(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'entourage-create-slug',
            'guest_code' => 'ENC123',
            'status' => 'draft',
        ]);

        for ($index = 0; $index < 50; $index++) {
            EntourageMember::create([
                'invitation_id' => $invitation->id,
                'name' => 'Member ' . $index,
                'role' => 'bridesmaid',
                'sort_order' => $index,
            ]);
        }

        $this->postJson('/api/v1/entourage', [
            'name' => 'Extra Member',
            'role' => 'groomsman',
        ])
            ->assertUnprocessable()
            ->assertJson([
                'message' => 'Entourage member limit reached. Maximum 50 members.',
            ]);
    }

    public function test_create_rejects_invalid_role(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'entourage-invalid-role',
            'guest_code' => 'ENR123',
            'status' => 'draft',
        ]);

        $this->postJson('/api/v1/entourage', [
            'name' => 'Invalid Role Member',
            'role' => 'bestman',
        ])->assertUnprocessable()->assertJsonValidationErrors(['role']);
    }

    public function test_update_requires_owned_member(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $otherUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $ownerInvitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'owner-entourage-slug',
            'guest_code' => 'OEN123',
            'status' => 'draft',
        ]);
        Invitation::create([
            'user_id' => $otherUser->id,
            'slug' => 'other-entourage-slug',
            'guest_code' => 'TEN123',
            'status' => 'draft',
        ]);

        $member = EntourageMember::create([
            'invitation_id' => $ownerInvitation->id,
            'name' => 'Owner Member',
            'role' => 'ninong',
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($otherUser);

        $this->putJson('/api/v1/entourage/' . $member->id, [
            'name' => 'Tampered Name',
        ])->assertNotFound();
    }

    public function test_reorder_updates_sort_order(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'entourage-reorder-slug',
            'guest_code' => 'ENO123',
            'status' => 'draft',
        ]);

        $memberA = EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'A',
            'role' => 'ninong',
            'sort_order' => 0,
        ]);
        $memberB = EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'B',
            'role' => 'ninang',
            'sort_order' => 1,
        ]);
        $memberC = EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'C',
            'role' => 'bridesmaid',
            'sort_order' => 2,
        ]);

        $this->postJson('/api/v1/entourage/reorder', [
            'ids' => [$memberC->id, $memberA->id, $memberB->id],
        ])->assertOk();

        $this->assertDatabaseHas('entourage_members', [
            'id' => $memberC->id,
            'sort_order' => 0,
        ]);
        $this->assertDatabaseHas('entourage_members', [
            'id' => $memberA->id,
            'sort_order' => 1,
        ]);
        $this->assertDatabaseHas('entourage_members', [
            'id' => $memberB->id,
            'sort_order' => 2,
        ]);
    }

    public function test_delete_removes_member_photo_from_r2_and_reduces_storage_when_media_record_exists(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'storage_used_bytes' => 70_000,
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'entourage-delete-slug',
            'guest_code' => 'END123',
            'status' => 'draft',
        ]);

        $filePath = 'users/' . $user->id . '/entourage/member-photo.webp';
        Storage::disk('r2')->put($filePath, 'binary');

        $media = MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'entourage',
            'file_path' => $filePath,
            'file_name' => 'member-photo.webp',
            'file_size_bytes' => 12_000,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);

        $member = EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => 'Member with Photo',
            'role' => 'groomsman',
            'photo_path' => $filePath,
            'sort_order' => 0,
        ]);

        $this->deleteJson('/api/v1/entourage/' . $member->id)->assertNoContent();

        $this->assertDatabaseMissing('entourage_members', ['id' => $member->id]);
        $this->assertDatabaseMissing('media_files', ['id' => $media->id]);
        Storage::disk('r2')->assertMissing($filePath);
        $this->assertSame(58_000, (int) $user->fresh()->storage_used_bytes);
    }
}
