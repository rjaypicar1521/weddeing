<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GuestInviteNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Invitation $invitation,
        private readonly Rsvp $guest,
    ) {
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
        $partner1 = trim((string) ($this->invitation->partner1_name ?? ''));
        $partner2 = trim((string) ($this->invitation->partner2_name ?? ''));
        $coupleName = $partner1 !== '' && $partner2 !== ''
            ? "{$partner1} & {$partner2}"
            : ($partner1 !== '' ? $partner1 : ($partner2 !== '' ? $partner2 : 'The Couple'));

        $guestName = (string) $this->guest->guest_name;
        $url = rtrim((string) env('FRONTEND_URL', config('app.url')), '/') . '/i/' . $this->invitation->slug;
        $accessCode = (string) ($this->guest->guestGroup?->access_code ?? $this->invitation->guest_code ?? '');
        $date = $this->invitation->wedding_date?->format('F j, Y') ?? 'TBD';
        $time = (string) ($this->invitation->wedding_time ?? 'TBD');
        $venue = (string) ($this->invitation->venue_name ?? 'TBD');

        return (new MailMessage)
            ->subject("You're Invited: {$coupleName}'s Wedding")
            ->greeting("Hi {$guestName},")
            ->line("You are warmly invited to {$coupleName}'s wedding.")
            ->line("Event: {$date} {$time} at {$venue}")
            ->line($accessCode !== '' ? "Your invitation access code: {$accessCode}" : 'Use your invitation access code to enter the invitation page.')
            ->action('Open Invitation', $url)
            ->line('Please submit your RSVP when you can.');
    }
}
