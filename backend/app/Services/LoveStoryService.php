<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\LoveStoryChapter;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LoveStoryService
{
    /**
     * @return array<int, LoveStoryChapter>
     */
    public function list(User $user): array
    {
        $invitation = $this->resolveInvitation($user);

        return LoveStoryChapter::query()
            ->where('invitation_id', $invitation->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->all();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(User $user, array $payload): LoveStoryChapter
    {
        $invitation = $this->resolveInvitation($user);

        $chapterCount = LoveStoryChapter::query()
            ->where('invitation_id', $invitation->id)
            ->count();

        if ($chapterCount >= 10) {
            throw new HttpException(422, 'Love story chapter limit reached. Maximum 10 chapters.');
        }

        $sortOrder = $payload['sort_order'] ?? $chapterCount;

        return LoveStoryChapter::create([
            'invitation_id' => $invitation->id,
            'title' => $payload['title'],
            'story_text' => $payload['story_text'],
            'photo_path' => $payload['photo_path'] ?? null,
            'chapter_date' => $payload['chapter_date'] ?? null,
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(User $user, int $chapterId, array $payload): LoveStoryChapter
    {
        $chapter = $this->resolveOwnedChapter($user, $chapterId);
        $previousPhotoPath = $chapter->photo_path;

        $chapter->fill($payload);
        $chapter->save();

        $nextPhotoPath = $chapter->photo_path;
        if (array_key_exists('photo_path', $payload) && $previousPhotoPath && $previousPhotoPath !== $nextPhotoPath) {
            $this->deletePhotoPath($user, (int) $chapter->invitation_id, $previousPhotoPath);
        }

        return $chapter->fresh();
    }

    public function delete(User $user, int $chapterId): void
    {
        $chapter = $this->resolveOwnedChapter($user, $chapterId);

        DB::transaction(function () use ($user, $chapter): void {
            if ($chapter->photo_path) {
                $this->deletePhotoPath($user, (int) $chapter->invitation_id, $chapter->photo_path);
            }

            $chapter->delete();
        });
    }

    /**
     * @param array<int, int> $ids
     */
    public function reorder(User $user, array $ids): void
    {
        $invitation = $this->resolveInvitation($user);

        $chapters = LoveStoryChapter::query()
            ->where('invitation_id', $invitation->id)
            ->whereIn('id', $ids)
            ->get();

        if ($chapters->count() !== count($ids)) {
            throw new HttpException(422, 'Reorder payload contains invalid chapter IDs.');
        }

        DB::transaction(function () use ($ids): void {
            foreach ($ids as $index => $id) {
                LoveStoryChapter::query()
                    ->where('id', $id)
                    ->update(['sort_order' => $index]);
            }
        });
    }

    private function resolveInvitation(User $user): Invitation
    {
        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        return $invitation;
    }

    private function resolveOwnedChapter(User $user, int $chapterId): LoveStoryChapter
    {
        $invitation = $this->resolveInvitation($user);

        $chapter = LoveStoryChapter::query()
            ->where('id', $chapterId)
            ->where('invitation_id', $invitation->id)
            ->first();

        if (! $chapter) {
            throw new HttpException(404, 'Love story chapter not found.');
        }

        return $chapter;
    }

    private function deletePhotoPath(User $user, int $invitationId, string $photoPath): void
    {
        $relativePath = $this->resolveRelativePath($photoPath);

        if ($relativePath === null) {
            return;
        }

        Storage::disk('r2')->delete($relativePath);

        $mediaFile = MediaFile::query()
            ->where('invitation_id', $invitationId)
            ->where('user_id', $user->id)
            ->where('type', 'chapter')
            ->where('file_path', $relativePath)
            ->first();

        if (! $mediaFile) {
            return;
        }

        $fileSize = (int) $mediaFile->file_size_bytes;
        $mediaFile->delete();

        $nextUsed = max(0, (int) $user->storage_used_bytes - $fileSize);
        $user->forceFill([
            'storage_used_bytes' => $nextUsed,
        ])->save();
    }

    private function resolveRelativePath(string $photoPath): ?string
    {
        if (str_starts_with($photoPath, 'users/')) {
            return $photoPath;
        }

        if (str_starts_with($photoPath, 'http://') || str_starts_with($photoPath, 'https://')) {
            $diskBaseUrl = rtrim((string) Storage::disk('r2')->url(''), '/');
            if ($diskBaseUrl !== '' && str_starts_with($photoPath, $diskBaseUrl . '/')) {
                return ltrim(substr($photoPath, strlen($diskBaseUrl)), '/');
            }
        }

        return null;
    }
}
