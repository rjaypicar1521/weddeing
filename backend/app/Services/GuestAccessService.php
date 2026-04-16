<?php

namespace App\Services;

use App\Models\GuestGroup;
use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\Rsvp;
use App\Models\Wish;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GuestAccessService
{
    public function __construct(private readonly GuestTokenService $guestTokenService)
    {
    }

    /**
     * @return array{guest_token: string, invitation_slug: string, group: array{id:int, name:string}|null}
     */
    public function validateCode(string $code): array
    {
        $guestGroup = GuestGroup::query()
            ->with('invitation')
            ->where('access_code', $code)
            ->where('status', 'active')
            ->first();

        if ($guestGroup) {
            $invitation = $guestGroup->invitation;
        } else {
            $invitation = Invitation::query()
                ->where('guest_code', $code)
                ->first();

            $guestGroup = $invitation?->defaultGuestGroup()->first();
        }

        if (! $invitation) {
            throw new HttpException(404, "Code doesn't match. Check your invitation.");
        }

        if ($invitation->status !== 'published') {
            throw new HttpException(404, "This invitation isn't available yet. Contact the couple.");
        }

        return [
            'guest_token' => $this->guestTokenService->issueToken($invitation, $guestGroup),
            'invitation_slug' => $invitation->slug,
            'group' => $guestGroup
                ? [
                    'id' => $guestGroup->id,
                    'name' => $guestGroup->name,
                ]
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getInvitationPayload(int $invitationId, ?int $guestGroupId = null): array
    {
        $invitation = Invitation::query()
            ->with([
                'template:id,name,slug,preview_image_path,plan_required,region,is_active',
                'loveStoryChapters' => fn ($query) => $query->orderBy('sort_order'),
                'entourageMembers' => fn ($query) => $query->orderBy('sort_order'),
                'guestGroups' => fn ($query) => $query->orderByDesc('is_default')->orderBy('name'),
            ])
            ->find($invitationId);

        if (! $invitation || $invitation->status !== 'published') {
            throw new HttpException(404, "This invitation isn't available yet. Contact the couple.");
        }

        $media = MediaFile::query()
            ->where('invitation_id', $invitation->id)
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

        $wishes = Wish::query()
            ->where('invitation_id', $invitation->id)
            ->where('is_flagged', false)
            ->latest('id')
            ->limit(10)
            ->get(['id', 'guest_name', 'message', 'created_at']);

        $guestGroup = $guestGroupId
            ? $invitation->guestGroups->firstWhere('id', $guestGroupId)
            : $invitation->defaultGuestGroup;

        $groupGuests = [];
        if ($guestGroup) {
            $groupGuests = Rsvp::query()
                ->where('invitation_id', $invitation->id)
                ->where('guest_group_id', $guestGroup->id)
                ->orderBy('guest_name')
                ->get(['id', 'guest_name', 'email', 'guest_status', 'submitted_at', 'attending', 'confirmation_code', 'meal_preference', 'transport', 'plus_one_name'])
                ->map(fn (Rsvp $guest) => [
                    'id' => $guest->id,
                    'guest_name' => $guest->guest_name,
                    'email' => $guest->email,
                    'guest_status' => $guest->guest_status,
                    'submitted_at' => $guest->submitted_at?->toISOString(),
                    'attending' => $guest->submitted_at ? $guest->attending : null,
                    'confirmation_code' => $guest->submitted_at ? $guest->confirmation_code : null,
                    'meal_preference' => $guest->submitted_at ? $guest->meal_preference : null,
                    'transport' => $guest->submitted_at ? $guest->transport : null,
                    'plus_one_name' => $guest->submitted_at ? $guest->plus_one_name : null,
                ])
                ->all();
        }

        return [
            'invitation' => [
                ...$invitation->toArray(),
                'published_at' => $invitation->published_at instanceof Carbon ? $invitation->published_at->toISOString() : null,
            ],
            'template' => $invitation->template,
            'love_story_chapters' => $invitation->loveStoryChapters,
            'entourage_members' => $invitation->entourageMembers,
            'media' => $media,
            'wishes' => $wishes,
            'group' => $guestGroup
                ? [
                    'id' => $guestGroup->id,
                    'name' => $guestGroup->name,
                    'access_code' => $guestGroup->access_code,
                    'guests' => $groupGuests,
                ]
                : null,
        ];
    }
}
