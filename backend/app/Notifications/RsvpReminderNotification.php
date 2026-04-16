<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\Rsvp;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RsvpReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Invitation $invitation,
        private readonly Rsvp $rsvp,
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
        $guestName = $this->rsvp->guest_name;
        $deadline = $this->resolveDeadlineText();
        $weddingDate = $this->invitation->wedding_date?->format('F j, Y') ?? 'TBD';
        $weddingTime = (string) ($this->invitation->wedding_time ?? 'TBD');
        $venueName = (string) ($this->invitation->venue_name ?? 'TBD');
        $rsvpUrl = rtrim((string) (env('FRONTEND_URL', config('app.url'))), '/') . '/i/' . $this->invitation->slug;

        return (new MailMessage)
            ->subject("Your RSVP for {$coupleName}'s Wedding")
            ->greeting("Hi {$guestName},")
            ->line("Please RSVP by {$deadline}.")
            ->line("Wedding Details: {$coupleName} • {$weddingDate} {$weddingTime} • {$venueName}")
            ->action('Submit RSVP', $rsvpUrl)
            ->line('We would love to celebrate with you.');
    }

    private function resolveDeadlineText(): string
    {
        $weddingDate = $this->invitation->wedding_date;
        if (! $weddingDate instanceof CarbonInterface) {
            return 'the soonest possible time';
        }

        $deadline = $weddingDate->copy()->subDays(7);
        return $deadline->isPast() ? 'the soonest possible time' : $deadline->format('F j, Y');
    }
}
