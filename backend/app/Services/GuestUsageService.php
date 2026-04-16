<?php

namespace App\Services;

use App\Models\User;

class GuestUsageService
{
    /**
     * @return array{guests_used:int, guest_limit:int, upgrade_needed:bool}
     */
    public function getUsage(User $user): array
    {
        $guestLimit = $this->resolveGuestLimit($user);
        $guestsUsed = $user->invitation?->rsvps()->count() ?? 0;

        return [
            'guests_used' => $guestsUsed,
            'guest_limit' => $guestLimit,
            'upgrade_needed' => $guestsUsed >= $guestLimit,
        ];
    }

    public function resolveGuestLimit(User $user): int
    {
        $invitation = $user->invitation;
        if ($invitation && is_int($invitation->guest_limit) && $invitation->guest_limit > 0) {
            return $invitation->guest_limit;
        }

        return $this->limitForPlan((string) $user->plan);
    }

    public function limitForPlan(string $plan): int
    {
        return $plan === 'premium' ? 250 : 25;
    }
}

