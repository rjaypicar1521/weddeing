<?php

namespace App\Jobs;

use App\Models\AdminReminder;
use App\Notifications\RsvpReminderNotification;
use App\Services\ActivityLogService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;
use Throwable;

class SendRsvpReminder implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        private readonly int $reminderId,
    ) {
    }

    public function handle(): void
    {
        $reminder = AdminReminder::query()->with(['invitation', 'rsvp'])->find($this->reminderId);
        if (! $reminder || ! $reminder->invitation || ! $reminder->rsvp) {
            return;
        }

        try {
            Notification::route('mail', $reminder->recipient_email)
                ->notify(new RsvpReminderNotification($reminder->invitation, $reminder->rsvp));

            $reminder->forceFill([
                'status' => 'sent',
                'sent_at' => now(),
                'error_message' => null,
            ])->save();

            app(ActivityLogService::class)->log(
                'reminder_sent',
                'Reminder sent to ' . ($reminder->rsvp->guest_name ?? $reminder->recipient_email),
                $reminder->sentBy,
                $reminder->sentBy?->name,
                null,
            );
        } catch (Throwable $exception) {
            $reminder->forceFill([
                'status' => 'failed',
                'error_message' => mb_substr($exception->getMessage(), 0, 500),
            ])->save();
        }
    }
}
