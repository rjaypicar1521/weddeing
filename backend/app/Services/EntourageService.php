<?php

namespace App\Services;

use App\Models\EntourageMember;
use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EntourageService
{
    /**
     * @return array<int, EntourageMember>
     */
    public function list(User $user): array
    {
        $invitation = $this->resolveInvitation($user);

        return EntourageMember::query()
            ->where('invitation_id', $invitation->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->all();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(User $user, array $payload): EntourageMember
    {
        $invitation = $this->resolveInvitation($user);

        $memberCount = EntourageMember::query()
            ->where('invitation_id', $invitation->id)
            ->count();

        if ($memberCount >= 50) {
            throw new HttpException(422, 'Entourage member limit reached. Maximum 50 members.');
        }

        $sortOrder = $payload['sort_order'] ?? $memberCount;

        return EntourageMember::create([
            'invitation_id' => $invitation->id,
            'name' => $payload['name'],
            'role' => $payload['role'],
            'photo_path' => $payload['photo_path'] ?? null,
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(User $user, int $memberId, array $payload): EntourageMember
    {
        $member = $this->resolveOwnedMember($user, $memberId);
        $previousPhotoPath = $member->photo_path;

        $member->fill($payload);
        $member->save();

        $nextPhotoPath = $member->photo_path;
        if (array_key_exists('photo_path', $payload) && $previousPhotoPath && $previousPhotoPath !== $nextPhotoPath) {
            $this->deletePhotoPath($user, (int) $member->invitation_id, $previousPhotoPath);
        }

        return $member->fresh();
    }

    public function delete(User $user, int $memberId): void
    {
        $member = $this->resolveOwnedMember($user, $memberId);

        DB::transaction(function () use ($user, $member): void {
            if ($member->photo_path) {
                $this->deletePhotoPath($user, (int) $member->invitation_id, $member->photo_path);
            }

            $member->delete();
        });
    }

    /**
     * @param array<int, int> $ids
     */
    public function reorder(User $user, array $ids): void
    {
        $invitation = $this->resolveInvitation($user);

        $members = EntourageMember::query()
            ->where('invitation_id', $invitation->id)
            ->whereIn('id', $ids)
            ->get();

        if ($members->count() !== count($ids)) {
            throw new HttpException(422, 'Reorder payload contains invalid entourage member IDs.');
        }

        DB::transaction(function () use ($ids): void {
            foreach ($ids as $index => $id) {
                EntourageMember::query()
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

    private function resolveOwnedMember(User $user, int $memberId): EntourageMember
    {
        $invitation = $this->resolveInvitation($user);

        $member = EntourageMember::query()
            ->where('id', $memberId)
            ->where('invitation_id', $invitation->id)
            ->first();

        if (! $member) {
            throw new HttpException(404, 'Entourage member not found.');
        }

        return $member;
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
            ->where('type', 'entourage')
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
