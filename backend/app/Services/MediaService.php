<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MediaService
{
    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function upload(User $user, UploadedFile $file, array $payload): array
    {
        $invitation = $this->resolveInvitation($user, $payload['invitation_id'] ?? null);
        $type = (string) $payload['type'];
        $isHero = $type === 'hero';

        $uuid = (string) Str::uuid();
        $isQrCode = $type === 'qr_code';
        $encoded = $this->encodeForStorage($file, $isQrCode);
        $mimeType = $encoded['mime_type'];
        $extension = $encoded['extension'];
        $folder = $isQrCode ? 'qr' : $type;
        $relativePath = sprintf('users/%d/%s/%s.%s', $user->id, $folder, $uuid, $extension);
        $binary = $encoded['binary'];
        $fileSize = strlen($binary);

        Storage::disk('r2')->put($relativePath, $binary, [
            'visibility' => 'public',
            'ContentType' => $mimeType,
        ]);

        /** @var MediaFile $mediaFile */
        $mediaFile = DB::transaction(function () use ($user, $invitation, $type, $isHero, $relativePath, $file, $fileSize, $mimeType) {
            if ($type === 'gallery') {
                $count = MediaFile::query()
                    ->where('invitation_id', $invitation->id)
                    ->where('user_id', $user->id)
                    ->where('type', 'gallery')
                    ->count();

                if ($count >= 10) {
                    throw new HttpException(422, 'Gallery limit reached. Maximum 10 photos.');
                }
            }

            if ($isHero) {
                $existingHeroes = MediaFile::query()
                    ->where('invitation_id', $invitation->id)
                    ->where('user_id', $user->id)
                    ->where('type', 'hero')
                    ->get();

                $releasedStorage = 0;
                foreach ($existingHeroes as $existingHero) {
                    $releasedStorage += (int) $existingHero->file_size_bytes;
                    Storage::disk('r2')->delete($existingHero->file_path);
                    $existingHero->delete();
                }

                if ($releasedStorage > 0) {
                    $updated = max(0, (int) $user->storage_used_bytes - $releasedStorage);
                    $user->forceFill([
                        'storage_used_bytes' => $updated,
                    ])->save();
                }
            }

            $mediaFile = MediaFile::create([
                'invitation_id' => $invitation->id,
                'user_id' => $user->id,
                'type' => $type,
                'file_path' => $relativePath,
                'file_name' => $file->getClientOriginalName(),
                'file_size_bytes' => $fileSize,
                'mime_type' => $mimeType,
                'sort_order' => 0,
            ]);

            $user->increment('storage_used_bytes', $fileSize);

            return $mediaFile;
        });

        return [
            'id' => $mediaFile->id,
            'url' => Storage::disk('r2')->url($relativePath),
            'type' => $mediaFile->type,
            'file_size_bytes' => $mediaFile->file_size_bytes,
        ];
    }

    public function delete(User $user, int $mediaId): void
    {
        $media = MediaFile::query()
            ->where('id', $mediaId)
            ->where('user_id', $user->id)
            ->first();

        if (! $media) {
            throw new HttpException(404, 'Media file not found.');
        }

        Storage::disk('r2')->delete($media->file_path);

        DB::transaction(function () use ($media, $user) {
            $fileSize = (int) $media->file_size_bytes;
            $media->delete();

            $updated = max(0, (int) $user->storage_used_bytes - $fileSize);
            $user->forceFill([
                'storage_used_bytes' => $updated,
            ])->save();
        });
    }

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function list(User $user): array
    {
        $invitation = $this->resolveInvitation($user, null);

        $grouped = MediaFile::query()
            ->where('invitation_id', $invitation->id)
            ->where('user_id', $user->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->groupBy('type')
            ->map(function ($items) {
                return $items->map(function (MediaFile $item) {
                    return [
                        'id' => $item->id,
                        'invitation_id' => $item->invitation_id,
                        'user_id' => $item->user_id,
                        'type' => $item->type,
                        'file_path' => $item->file_path,
                        'file_name' => $item->file_name,
                        'file_size_bytes' => $item->file_size_bytes,
                        'mime_type' => $item->mime_type,
                        'url' => Storage::disk('r2')->url($item->file_path),
                    ];
                })->values()->all();
            })
            ->toArray();

        return $grouped;
    }

    private function resolveInvitation(User $user, mixed $invitationId): Invitation
    {
        if (is_numeric($invitationId)) {
            $invitation = Invitation::query()
                ->where('id', (int) $invitationId)
                ->where('user_id', $user->id)
                ->first();

            if ($invitation) {
                return $invitation;
            }
        }

        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        return $invitation;
    }

    /**
     * @return array{binary: string, mime_type: string, extension: string}
     */
    private function encodeForStorage(UploadedFile $file, bool $isQrCode): array
    {
        $binary = (string) file_get_contents($file->getRealPath());

        $manager = $this->imageManager();
        if (! $manager) {
            return [
                'binary' => $binary,
                'mime_type' => $isQrCode ? 'image/png' : 'image/webp',
                'extension' => $isQrCode ? 'png' : 'webp',
            ];
        }

        $image = $manager->read($file->getRealPath());

        if ($isQrCode) {
            return [
                'binary' => (string) $image->toPng(),
                'mime_type' => 'image/png',
                'extension' => 'png',
            ];
        }

        return [
            'binary' => (string) $image->toWebp(85),
            'mime_type' => 'image/webp',
            'extension' => 'webp',
        ];
    }

    private function imageManager(): ?ImageManager
    {
        if (extension_loaded('gd')) {
            return new ImageManager(new Driver());
        }

        if (extension_loaded('imagick')) {
            return new ImageManager(new ImagickDriver());
        }

        return null;
    }
}
