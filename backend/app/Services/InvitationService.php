<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\InvitationTemplate;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InvitationService
{
    public function createForUser(User $user): Invitation
    {
        $existingInvitation = $user->invitation;
        if ($existingInvitation) {
            throw new HttpException(409, 'An invitation already exists for this account.');
        }

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => $this->generateUniqueSlug($user->name, 'wedding'),
            'guest_code' => Invitation::generateUniqueGuestCode(),
            'guest_limit' => $user->plan === 'premium' ? 250 : 25,
            'status' => 'draft',
        ]);

        return $invitation->fresh();
    }

    public function getByUser(User $user): Invitation
    {
        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        return $invitation->fresh();
    }

    public function publish(User $user): Invitation
    {
        $invitation = $this->getByUser($user);

        $invitation->forceFill([
            'status' => 'published',
            'published_at' => now(),
        ])->save();

        return $invitation->fresh();
    }

    public function unpublish(User $user): Invitation
    {
        $invitation = $this->getByUser($user);

        $invitation->forceFill([
            'status' => 'draft',
            'published_at' => null,
        ])->save();

        return $invitation->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(User $user): array
    {
        $invitation = Invitation::query()
            ->where('user_id', $user->id)
            ->with([
                'template:id,name,slug,preview_image_path,plan_required,region,is_active',
                'loveStoryChapters' => fn ($query) => $query->orderBy('sort_order'),
                'entourageMembers' => fn ($query) => $query->orderBy('sort_order'),
            ])
            ->first();

        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        $media = MediaFile::query()
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

        return [
            'preview_mode' => true,
            'invitation' => [
                ...$invitation->toArray(),
                'published_at' => $invitation->published_at instanceof Carbon ? $invitation->published_at->toISOString() : null,
            ],
            'template' => $invitation->template,
            'love_story_chapters' => $invitation->loveStoryChapters,
            'entourage_members' => $invitation->entourageMembers,
            'media' => $media,
        ];
    }

    /**
     * @return array{guest_code: string, message: string}
     */
    public function regenerateGuestCode(User $user): array
    {
        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        $invitation->forceFill([
            'guest_code' => Invitation::generateUniqueGuestCode(),
        ])->save();

        $defaultGroup = $invitation->defaultGuestGroup()->first();
        if ($defaultGroup) {
            $defaultGroup->forceFill([
                'access_code' => $invitation->guest_code,
            ])->save();
        }

        return [
            'guest_code' => $invitation->guest_code,
            'message' => 'Existing guests need new code',
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateWeddingDetails(User $user, array $payload): Invitation
    {
        $invitation = $user->invitation;

        if (! $invitation) {
            $invitation = $this->createForUser($user);
            $invitation->slug = $this->generateUniqueSlug($payload['partner1_name'] ?? '', $payload['partner2_name'] ?? '');
            $invitation->save();
        }

        $templateId = $payload['template_id'] ?? null;
        $template = null;

        if ($templateId !== null) {
            $template = InvitationTemplate::query()
                ->where('id', $templateId)
                ->where('is_active', true)
                ->first();

            if (! $template) {
                throw new HttpException(422, 'The selected template is invalid.');
            }

            if ($user->plan === 'free' && $template->plan_required === 'premium') {
                throw new HttpException(403, 'Upgrade to Premium to use this template');
            }
        }

        $invitation->fill([
            'partner1_name' => $this->valueOrCurrent($payload, 'partner1_name', $invitation->partner1_name),
            'partner2_name' => $this->valueOrCurrent($payload, 'partner2_name', $invitation->partner2_name),
            'wedding_date' => $this->valueOrCurrent($payload, 'wedding_date', $invitation->wedding_date),
            'wedding_time' => $this->valueOrCurrent($payload, 'wedding_time', $invitation->wedding_time),
            'venue_name' => $this->valueOrCurrent($payload, 'venue_name', $invitation->venue_name),
            'venue_address' => $this->valueOrCurrent($payload, 'venue_address', $invitation->venue_address),
            'dress_code' => $this->valueOrCurrent($payload, 'dress_code', $invitation->dress_code),
            'dress_code_colors' => $this->valueOrCurrent($payload, 'dress_code_colors', $invitation->dress_code_colors),
            'template_id' => $template?->id ?? $this->valueOrCurrent($payload, 'template_id', $invitation->template_id),
            'color_palette' => $this->valueOrCurrent($payload, 'color_palette', $invitation->color_palette),
            'music_url' => $this->valueOrCurrent($payload, 'music_url', $invitation->music_url),
            'prenup_video_url' => $this->valueOrCurrent($payload, 'prenup_video_url', $invitation->prenup_video_url),
            'gift_methods' => array_key_exists('gift_methods', $payload)
                ? $this->normalizeGiftMethods($user, $invitation, $payload['gift_methods'])
                : $invitation->gift_methods,
            'schedule' => $this->valueOrCurrent($payload, 'schedule', $invitation->schedule),
        ]);

        $invitation->save();

        return $invitation->fresh();
    }

    private function generateUniqueSlug(string $partner1Name, string $partner2Name): string
    {
        $base = Str::slug(trim($partner1Name . '-' . $partner2Name));
        $base = $base !== '' ? $base : 'wedding-invite';

        do {
            $slug = $base . '-' . Str::lower(Str::random(6));
        } while (Invitation::where('slug', $slug)->exists());

        return $slug;
    }

    /**
     * @param array<string, mixed> $payload
     * @param mixed $current
     * @return mixed
     */
    private function valueOrCurrent(array $payload, string $key, mixed $current): mixed
    {
        return array_key_exists($key, $payload) ? $payload[$key] : $current;
    }

    /**
     * @param mixed $giftMethods
     * @return array<int, array<string, string>>|null
     */
    private function normalizeGiftMethods(User $user, Invitation $invitation, mixed $giftMethods): ?array
    {
        if (! is_array($giftMethods)) {
            return null;
        }

        $normalized = [];
        foreach ($giftMethods as $index => $method) {
            if (! is_array($method)) {
                throw new HttpException(422, "Gift method at index {$index} is invalid.");
            }

            $qrPath = $this->resolveRelativeMediaPath((string) ($method['qr_path'] ?? ''));
            if ($qrPath === null) {
                throw new HttpException(422, "Gift method at index {$index} has an invalid qr_path.");
            }

            $qrExists = MediaFile::query()
                ->where('invitation_id', $invitation->id)
                ->where('user_id', $user->id)
                ->where('type', 'qr_code')
                ->where('file_path', $qrPath)
                ->exists();

            if (! $qrExists) {
                throw new HttpException(422, "Gift method at index {$index} uses a QR code that does not exist.");
            }

            $normalized[] = [
                'label' => (string) $method['label'],
                'qr_path' => '/' . ltrim($qrPath, '/'),
                'account_name' => (string) $method['account_name'],
                'account_number' => (string) $method['account_number'],
            ];
        }

        return $normalized;
    }

    private function resolveRelativeMediaPath(string $rawPath): ?string
    {
        $path = trim($rawPath);
        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, '/users/')) {
            return ltrim($path, '/');
        }

        if (str_starts_with($path, 'users/')) {
            return $path;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $diskBaseUrl = rtrim((string) Storage::disk('r2')->url(''), '/');
            if ($diskBaseUrl !== '' && str_starts_with($path, $diskBaseUrl . '/')) {
                return ltrim(substr($path, strlen($diskBaseUrl)), '/');
            }
        }

        return null;
    }
}

