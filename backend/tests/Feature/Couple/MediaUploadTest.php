<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    private function validPngBinary(): string
    {
        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W7k8AAAAASUVORK5CYII=',
            true
        ) ?: '';
    }

    public function test_photo_upload_converts_to_webp_and_updates_storage(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
            'storage_limit_bytes' => 50 * 1024 * 1024,
            'storage_used_bytes' => 0,
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'media-test-slug',
            'guest_code' => 'ABC123',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('hero.png', $this->validPngBinary()),
            'type' => 'hero',
            'invitation_id' => $invitation->id,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['id', 'url', 'type', 'file_size_bytes']);

        $media = MediaFile::query()->firstOrFail();
        $this->assertStringEndsWith('.webp', $media->file_path);
        $this->assertSame('image/webp', $media->mime_type);
        $this->assertGreaterThan(0, (int) $user->fresh()->storage_used_bytes);
    }

    public function test_qr_upload_is_kept_as_png(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
            'storage_limit_bytes' => 50 * 1024 * 1024,
            'storage_used_bytes' => 0,
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'qr-test-slug',
            'guest_code' => 'ABC124',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('qr.png', $this->validPngBinary()),
            'type' => 'qr_code',
        ]);

        $response->assertCreated();

        $media = MediaFile::query()->firstOrFail();
        $this->assertStringContainsString('/qr/', $media->file_path);
        $this->assertStringEndsWith('.png', $media->file_path);
        $this->assertSame('image/png', $media->mime_type);
    }

    public function test_upload_is_blocked_when_storage_limit_exceeded(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
            'storage_limit_bytes' => 50 * 1024 * 1024,
            'storage_used_bytes' => (50 * 1024 * 1024) - 1024,
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'quota-test-slug',
            'guest_code' => 'ABC125',
            'status' => 'draft',
        ]);

        $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('big.png', str_repeat($this->validPngBinary(), 3000)),
            'type' => 'hero',
        ])
            ->assertUnprocessable()
            ->assertJson([
                'message' => 'Storage limit reached. Upgrade to Premium.',
            ]);
    }

    public function test_delete_media_removes_record_and_reduces_storage(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'storage_limit_bytes' => 50 * 1024 * 1024,
            'storage_used_bytes' => 20_000,
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'delete-test-slug',
            'guest_code' => 'ABC126',
            'status' => 'draft',
        ]);

        $media = MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'hero',
            'file_path' => 'users/' . $user->id . '/hero/delete.webp',
            'file_name' => 'delete.webp',
            'file_size_bytes' => 10_000,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);
        Storage::disk('r2')->put($media->file_path, 'dummy');

        $this->deleteJson('/api/v1/media/' . $media->id)
            ->assertNoContent();

        $this->assertDatabaseMissing('media_files', ['id' => $media->id]);
        $this->assertSame(10_000, (int) $user->fresh()->storage_used_bytes);
    }

    public function test_media_list_returns_grouped_items_for_user_invitation(): void
    {
        Storage::fake('r2');

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'list-test-slug',
            'guest_code' => 'ABC127',
            'status' => 'draft',
        ]);

        MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'hero',
            'file_path' => 'users/' . $user->id . '/hero/hero.webp',
            'file_name' => 'hero.webp',
            'file_size_bytes' => 2000,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);
        MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'gallery',
            'file_path' => 'users/' . $user->id . '/gallery/one.webp',
            'file_name' => 'one.webp',
            'file_size_bytes' => 3000,
            'mime_type' => 'image/webp',
            'sort_order' => 0,
        ]);

        $response = $this->getJson('/api/v1/media');

        $response->assertOk()
            ->assertJsonPath('media.hero.0.type', 'hero')
            ->assertJsonPath('media.gallery.0.type', 'gallery');
    }
}
