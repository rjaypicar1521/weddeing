<?php

namespace App\Services;

use App\Events\GuestRsvpSubmitted;
use App\Models\GuestGroup;
use App\Models\Invitation;
use App\Models\Rsvp;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GuestRsvpService
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {
    }

    public function getByTokenHash(string $tokenHash): ?Rsvp
    {
        return Rsvp::query()
            ->where('guest_token_hash', $tokenHash)
            ->whereNotNull('submitted_at')
            ->first();
    }

    /**
     * @return array{rsvp:?array<string, mixed>, latest_rsvp:?array<string, mixed>, rsvps:array<int, array<string, mixed>>}
     */
    public function getSubmissionState(int $invitationId, ?int $guestGroupId, string $tokenHash): array
    {
        $query = Rsvp::query()
            ->where('invitation_id', $invitationId)
            ->whereNotNull('submitted_at')
            ->orderByDesc('submitted_at');

        if ($guestGroupId !== null) {
            $query->where('guest_group_id', $guestGroupId);
        }

        $submittedRsvps = $query->get();
        $latestRsvp = $submittedRsvps->first(
            fn (Rsvp $rsvp): bool => $rsvp->guest_token_hash === $tokenHash,
        );
        $latestGroupRsvp = $submittedRsvps->first();

        return [
            'rsvp' => $latestRsvp ? $this->transformRsvp($latestRsvp) : null,
            'latest_rsvp' => $latestRsvp
                ? $this->transformRsvp($latestRsvp)
                : ($latestGroupRsvp ? $this->transformRsvp($latestGroupRsvp) : null),
            'rsvps' => $submittedRsvps
                ->map(fn (Rsvp $rsvp): array => $this->transformRsvp($rsvp))
                ->values()
                ->all(),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function submit(int $invitationId, ?int $guestGroupId, string $tokenHash, ?string $ipAddress, array $payload): Rsvp
    {
        $attending = (bool) ($payload['attending'] ?? false);
        $guestId = isset($payload['guest_id']) ? (int) $payload['guest_id'] : null;
        $guestName = trim((string) ($payload['guest_name'] ?? ''));

        $invitation = Invitation::query()->find($invitationId);
        if (! $invitation) {
            throw new HttpException(404, 'Invitation not found.');
        }

        $guestGroup = $guestGroupId !== null
            ? GuestGroup::query()
                ->where('invitation_id', $invitationId)
                ->find($guestGroupId)
            : $invitation->defaultGuestGroup()->first();

        if ($guestId !== null) {
            $rsvp = $this->submitForExistingGuest(
                invitationId: $invitationId,
                guestGroupId: $guestGroup?->id,
                guestId: $guestId,
                tokenHash: $tokenHash,
                ipAddress: $ipAddress,
                payload: $payload,
                attending: $attending,
            );

            $this->logSubmission($rsvp, $attending, $ipAddress);

            return $rsvp->fresh();
        }

        $groupHasRoster = $this->groupHasRoster($invitationId, $guestGroup?->id);
        if ($groupHasRoster) {
            throw new HttpException(422, 'Select your guest name from the list before submitting RSVP.');
        }

        $existing = $this->getByTokenHash($tokenHash);
        if ($existing) {
            throw new HttpException(422, "You've already RSVPed! Here's your confirmation.");
        }

        if ($guestName === '') {
            throw new HttpException(422, 'Guest name is required.');
        }

        $rsvp = Rsvp::query()->create([
            'invitation_id' => $invitationId,
            'guest_group_id' => $guestGroup?->id,
            'guest_name' => $guestName,
            'attending' => $attending,
            'guest_status' => $attending ? 'attending' : 'declined',
            'plus_one_name' => $attending ? ($payload['plus_one_name'] ?? null) : null,
            'meal_preference' => $attending ? ($payload['meal_preference'] ?? null) : null,
            'transport' => $attending ? ($payload['transport'] ?? null) : null,
            'favorite_memory' => $payload['favorite_memory'] ?? null,
            'message_to_couple' => $payload['message_to_couple'] ?? null,
            'confirmation_code' => $this->generateConfirmationCode(),
            'guest_token_hash' => $tokenHash,
            'ip_address' => $ipAddress,
            'submitted_at' => Carbon::now(),
        ]);

        $this->logSubmission($rsvp, $attending, $ipAddress);

        return $rsvp->fresh();
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function submitForExistingGuest(
        int $invitationId,
        ?int $guestGroupId,
        int $guestId,
        string $tokenHash,
        ?string $ipAddress,
        array $payload,
        bool $attending,
    ): Rsvp {
        $guest = Rsvp::query()
            ->where('invitation_id', $invitationId)
            ->where('id', $guestId)
            ->first();

        if (! $guest) {
            throw new HttpException(404, 'Guest not found.');
        }

        if ($guestGroupId !== null && $guest->guest_group_id !== $guestGroupId) {
            throw new HttpException(403, 'This guest does not belong to your group.');
        }

        if ($guest->submitted_at !== null) {
            throw new HttpException(422, 'This guest already has a recorded RSVP.');
        }

        $guest->fill([
            'guest_group_id' => $guestGroupId,
            'attending' => $attending,
            'guest_status' => $attending ? 'attending' : 'declined',
            'plus_one_name' => $attending ? ($payload['plus_one_name'] ?? null) : null,
            'meal_preference' => $attending ? ($payload['meal_preference'] ?? null) : null,
            'transport' => $attending ? ($payload['transport'] ?? null) : null,
            'favorite_memory' => $payload['favorite_memory'] ?? null,
            'message_to_couple' => $payload['message_to_couple'] ?? null,
            'ip_address' => $ipAddress,
            'submitted_at' => Carbon::now(),
            'confirmation_code' => $guest->confirmation_code ?: $this->generateConfirmationCode(),
        ]);
        $guest->save();

        return $guest;
    }

    private function groupHasRoster(int $invitationId, ?int $guestGroupId): bool
    {
        $query = Rsvp::query()->where('invitation_id', $invitationId);
        if ($guestGroupId !== null) {
            $query->where('guest_group_id', $guestGroupId);
        }

        return $query->exists();
    }

    private function logSubmission(Rsvp $rsvp, bool $attending, ?string $ipAddress): void
    {
        GuestRsvpSubmitted::dispatch($rsvp);
        $this->activityLogService->log(
            'rsvp_submitted',
            $attending
                ? ('Attending' . ($rsvp->plus_one_name ? ' + ' . $rsvp->plus_one_name : ''))
                : 'Declined',
            userName: (string) $rsvp->guest_name,
            ip: $ipAddress,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRsvp(Rsvp $rsvp): array
    {
        return [
            'id' => $rsvp->id,
            'guest_name' => $rsvp->guest_name,
            'attending' => $rsvp->attending,
            'plus_one_name' => $rsvp->plus_one_name,
            'meal_preference' => $rsvp->meal_preference,
            'transport' => $rsvp->transport,
            'favorite_memory' => $rsvp->favorite_memory,
            'message_to_couple' => $rsvp->message_to_couple,
            'confirmation_code' => $rsvp->confirmation_code,
            'submitted_at' => $rsvp->submitted_at?->toISOString(),
            'guest_group_id' => $rsvp->guest_group_id,
            'email' => $rsvp->email,
        ];
    }

    private function generateConfirmationCode(): string
    {
        $characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($index = 0; $index < 6; $index++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
        } while (Rsvp::query()->where('confirmation_code', $code)->exists());

        return $code;
    }
}
