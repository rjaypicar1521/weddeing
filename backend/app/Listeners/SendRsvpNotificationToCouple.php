<?php

namespace App\Listeners;

use App\Events\GuestRsvpSubmitted;
use App\Events\GuestRsvpUpdated;
use App\Jobs\ProcessRsvpNotificationEmail;
use App\Notifications\GuestBoardingPassNotification;
use Illuminate\Support\Facades\Notification;
use Throwable;

class SendRsvpNotificationToCouple
{
    public function handleSubmitted(GuestRsvpSubmitted $event): void
    {
        ProcessRsvpNotificationEmail::dispatch($event->rsvp->id, 'submitted');

        $guestEmail = filter_var($event->rsvp->guest_name, FILTER_VALIDATE_EMAIL);
        if (is_string($guestEmail) && $guestEmail !== '') {
            try {
                Notification::route('mail', $guestEmail)
                    ->notify(new GuestBoardingPassNotification($event->rsvp));
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }

    public function handleUpdated(GuestRsvpUpdated $event): void
    {
        if ($event->changedFields === []) {
            return;
        }

        ProcessRsvpNotificationEmail::dispatch($event->rsvp->id, 'updated', $event->changedFields);
    }
}
