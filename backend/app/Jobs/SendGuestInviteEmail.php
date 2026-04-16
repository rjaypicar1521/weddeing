<?php

namespace App\Jobs;

use App\Models\Rsvp;
use App\Notifications\GuestInviteNotification;
use App\Services\ActivityLogService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;
use Throwable;

class SendGuestInviteEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        private readonly int $guestId,
    ) {
    }

    public function handle(): void
    {
        $guest = Rsvp::query()->with('invitation')->find($this->guestId);
        if (! $guest || ! $guest->invitation || ! $guest->email) {
            return;
        }

        try {
            Notification::route('mail', $guest->email)
                ->notify(new GuestInviteNotification($guest->invitation, $guest));

            app(ActivityLogService::class)->log(
                'invite_sent',
                'Invite sent to ' . $guest->guest_name,
                $guest->invitation->user,
                $guest->invitation->user?->name,
                null,
            );
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
