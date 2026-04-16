<?php

namespace App\Jobs;

use App\Models\Rsvp;
use App\Notifications\CoupleRsvpNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

class ProcessRsvpNotificationEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * @param 'submitted'|'updated' $type
     * @param array<int, string> $changedFields
     */
    public function __construct(
        private readonly int $rsvpId,
        private readonly string $type,
        private readonly array $changedFields = [],
    ) {
    }

    public function handle(): void
    {
        $rsvp = Rsvp::query()->with('invitation.user')->find($this->rsvpId);
        if (! $rsvp) {
            return;
        }

        $invitation = $rsvp->invitation;
        $couple = $invitation?->user;
        if (! $invitation || ! $couple) {
            return;
        }

        $limiterKey = 'rsvp-email:' . $invitation->id;
        if (RateLimiter::tooManyAttempts($limiterKey, 10)) {
            return;
        }

        RateLimiter::hit($limiterKey, 3600);

        try {
            $couple->notify(new CoupleRsvpNotification($rsvp, $this->type, $this->changedFields));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
