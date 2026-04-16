<?php

namespace App\Notifications;

use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RsvpSubmittedNotification extends Notification
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
        $guestName = $this->rsvp->guest_name;
        $status = $this->rsvp->attending ? 'attending' : 'not attending';

        return (new MailMessage)
            ->subject('New RSVP Received')
            ->line("{$guestName} has submitted an RSVP and is {$status}.")
            ->line('Confirmation code: ' . $this->rsvp->confirmation_code)
            ->line('Invitation: ' . ($invitation?->slug ?? 'N/A'));
    }
}

