<?php

namespace App\Notifications;

use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GuestBoardingPassNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Rsvp $rsvp)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $invitation = $this->rsvp->invitation;
        $coupleNames = trim((string) ($invitation?->partner1_name ?? '') . ' & ' . (string) ($invitation?->partner2_name ?? ''));
        $coupleDisplay = $coupleNames !== '&' && $coupleNames !== '' ? $coupleNames : 'the couple';

        return (new MailMessage)
            ->subject('Your Wedding RSVP Confirmation')
            ->line("Thank you for RSVPing to {$coupleDisplay}'s wedding.")
            ->line('Confirmation code: ' . $this->rsvp->confirmation_code)
            ->line('Guest: ' . $this->rsvp->guest_name)
            ->line('Date: ' . (($invitation?->wedding_date)?->format('F j, Y') ?? 'TBA'))
            ->line('Time: ' . ($invitation?->wedding_time ?? 'TBA'))
            ->line('Venue: ' . ($invitation?->venue_name ?? 'TBA'))
            ->line('Please keep this confirmation for your check-in.');
    }
}

