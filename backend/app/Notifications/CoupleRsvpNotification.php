<?php

namespace App\Notifications;

use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CoupleRsvpNotification extends Notification
{
    use Queueable;

    /**
     * @param 'submitted'|'updated' $type
     * @param array<int, string> $changedFields
     */
    public function __construct(
        private readonly Rsvp $rsvp,
        private readonly string $type,
        private readonly array $changedFields = [],
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
        $guestName = $this->rsvp->guest_name;
        $status = $this->rsvp->attending ? 'Attending' : 'Declined';
        $subject = $this->type === 'updated'
            ? "RSVP Updated: {$guestName}"
            : "New RSVP: {$guestName} - {$status}";

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting('Hello!')
            ->line($this->type === 'updated'
                ? "{$guestName}'s RSVP was manually updated."
                : "{$guestName} has submitted a new RSVP.")
            ->line('Status: ' . $status)
            ->line('+1: ' . ((string) ($this->rsvp->plus_one_name ?? 'None')))
            ->line('Meal: ' . ((string) ($this->rsvp->meal_preference ?? 'Not specified')))
            ->line('Transport: ' . ((string) ($this->rsvp->transport ?? 'Not specified')))
            ->line('This notification was sent by Wedding-Online.');

        if ($this->type === 'updated' && $this->changedFields !== []) {
            $mail->line('Changed fields: ' . implode(', ', $this->changedFields));
        }

        return $mail;
    }
}
