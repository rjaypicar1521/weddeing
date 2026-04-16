<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\LoveStoryChapter;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoveStoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_returns_ordered_love_story_chapters(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'story-list-slug',
            'guest_code' => 'STL123',
            'status' => 'draft',
        ]);

        LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'The Proposal',
            'story_text' => 'It happened on a beach.',
            'sort_order' => 2,
        ]);
        LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'How We Met',
            'story_text' => 'At a coffee shop.',
            'sort_order' => 0,
        ]);

        $this->getJson('/api/v1/love-story')
            ->assertOk()
            ->assertJsonPath('chapters.0.title', 'How We Met')
            ->assertJsonPath('chapters.1.title', 'The Proposal');
    }

    public function test_create_chapter_and_limit_maximum_to_ten(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'story-create-slug',
            'guest_code' => 'STC123',
            'status' => 'draft',
        ]);

        for ($index = 0; $index < 10; $index++) {
            LoveStoryChapter::create([
                'invitation_id' => $invitation->id,
                'title' => 'Chapter ' . $index,
                'story_text' => 'Story text ' . $index,
                'sort_order' => $index,
            ]);
        }

        $this->postJson('/api/v1/love-story', [
            'title' => 'Extra Chapter',
            'story_text' => 'Should fail due to max limit.',
        ])
            ->assertUnprocessable()
            ->assertJson([
                'message' => 'Love story chapter limit reached. Maximum 10 chapters.',
            ]);
    }

    public function test_update_requires_owned_chapter(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $otherUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $ownerInvitation = Invitation::create([
            'user_id' => $owner->id,
            'slug' => 'owner-story-slug',
            'guest_code' => 'OWN123',
            'status' => 'draft',
        ]);
        Invitation::create([
            'user_id' => $otherUser->id,
            'slug' => 'other-story-slug',
            'guest_code' => 'OTH123',
            'status' => 'draft',
        ]);

        $chapter = LoveStoryChapter::create([
            'invitation_id' => $ownerInvitation->id,
            'title' => 'Owner Chapter',
            'story_text' => 'Owner story',
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($otherUser);

        $this->putJson('/api/v1/love-story/' . $chapter->id, [
            'title' => 'Tampered Title',
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
            'slug' => 'story-reorder-slug',
            'guest_code' => 'STR123',
            'status' => 'draft',
        ]);

        $chapterA = LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'A',
            'story_text' => 'A',
            'sort_order' => 0,
        ]);
        $chapterB = LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'B',
            'story_text' => 'B',
            'sort_order' => 1,
        ]);
        $chapterC = LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'C',
            'story_text' => 'C',
            'sort_order' => 2,
        ]);

        $this->postJson('/api/v1/love-story/reorder', [
            'ids' => [$chapterC->id, $chapterA->id, $chapterB->id],
        ])->assertOk();

        $this->assertDatabaseHas('love_story_chapters', [
            'id' => $chapterC->id,
            'sort_order' => 0,
        ]);
        $this->assertDatabaseHas('love_story_chapters', [
            'id' => $chapterA->id,
            'sort_order' => 1,
        ]);
        $this->assertDatabaseHas('love_story_chapters', [
            'id' => $chapterB->id,
            'sort_order' => 2,
        ]);
    }

    public function test_delete_removes_chapter_photo_from_r2_and_reduces_storage_when_media_record_exists(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'storage_used_bytes' => 50_000,
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'story-delete-slug',
            'guest_code' => 'STD123',
            'status' => 'draft',
        ]);

        $filePath = 'users/' . $user->id . '/chapter/chapter-photo.webp';
        Storage::disk('r2')->put($filePath, 'binary');

        $media = MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'chapter',
            'file_path' => $filePath,
            'file_name' => 'chapter-photo.webp',
            'file_size_bytes' => 10_000,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);

        $chapter = LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => 'Chapter with Photo',
            'story_text' => 'Story with photo',
            'photo_path' => $filePath,
            'sort_order' => 0,
        ]);

        $this->deleteJson('/api/v1/love-story/' . $chapter->id)
            ->assertNoContent();

        $this->assertDatabaseMissing('love_story_chapters', ['id' => $chapter->id]);
        $this->assertDatabaseMissing('media_files', ['id' => $media->id]);
        Storage::disk('r2')->assertMissing($filePath);
        $this->assertSame(40_000, (int) $user->fresh()->storage_used_bytes);
    }
}
