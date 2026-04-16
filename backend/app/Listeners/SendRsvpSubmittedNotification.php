<?php

namespace App\Listeners;

use App\Events\RSVPSubmitted;
use App\Notifications\GuestBoardingPassNotification;
use App\Notifications\RsvpSubmittedNotification;
use Illuminate\Support\Facades\Notification;

class SendRsvpSubmittedNotification
{
    public function handle(RSVPSubmitted $event): void
    {
        $invitation = $event->rsvp->invitation()->with('user')->first();
        if (! $invitation || ! $invitation->user) {
            return;
        }

        $invitation->user->notify(new RsvpSubmittedNotification($event->rsvp));

        $guestEmail = filter_var($event->rsvp->guest_name, FILTER_VALIDATE_EMAIL);
        if (is_string($guestEmail) && $guestEmail !== '') {
            Notification::route('mail', $guestEmail)
                ->notify(new GuestBoardingPassNotification($event->rsvp));
        }
    }
}
