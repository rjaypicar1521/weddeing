<?php

namespace App\Services;

use App\Jobs\SendRsvpReminder;
use App\Models\AdminReminder;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminReminderService
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {
    }

    /**
     * @return array{queued:int, skipped:int, total_pending:int}
     */
    public function sendPending(User $admin): array
    {
        $pendingRsvps = Rsvp::query()
            ->where('attending', false)
            ->whereNull('submitted_at')
            ->with('invitation:id,slug,partner1_name,partner2_name,wedding_date,wedding_time,venue_name')
            ->get();

        $queued = 0;
        $skipped = 0;

        foreach ($pendingRsvps as $rsvp) {
            $email = $this->extractEmailFromRsvp($rsvp);
            if (! $email) {
                $this->createSkippedReminder($admin, $rsvp);
                $skipped++;
                continue;
            }

            $reminder = AdminReminder::query()->create([
                'invitation_id' => $rsvp->invitation_id,
                'rsvp_id' => $rsvp->id,
                'sent_by_user_id' => $admin->id,
                'recipient_email' => $email,
                'status' => 'queued',
            ]);

            SendRsvpReminder::dispatch($reminder->id);
            $queued++;
        }

        if ($queued > 0) {
            $this->activityLogService->log(
                'reminder_sent',
                "{$queued} reminders sent to pending guests",
                $admin,
                $admin->name,
                request()?->ip(),
            );
        }

        return [
            'queued' => $queued,
            'skipped' => $skipped,
            'total_pending' => $pendingRsvps->count(),
        ];
    }

    /**
     * @return array{queued:bool, skipped:bool, guest_name:string}
     */
    public function sendSingle(User $admin, int $rsvpId): array
    {
        $rsvp = Rsvp::query()
            ->with('invitation:id,slug,partner1_name,partner2_name,wedding_date,wedding_time,venue_name')
            ->find($rsvpId);

        if (! $rsvp) {
            throw new HttpException(404, 'RSVP not found.');
        }

        $email = $this->extractEmailFromRsvp($rsvp);
        if (! $email) {
            $this->createSkippedReminder($admin, $rsvp);
            return [
                'queued' => false,
                'skipped' => true,
                'guest_name' => (string) $rsvp->guest_name,
            ];
        }

        $reminder = AdminReminder::query()->create([
            'invitation_id' => $rsvp->invitation_id,
            'rsvp_id' => $rsvp->id,
            'sent_by_user_id' => $admin->id,
            'recipient_email' => $email,
            'status' => 'queued',
        ]);

        SendRsvpReminder::dispatch($reminder->id);
        $this->activityLogService->log(
            'reminder_sent',
            'Reminder queued for ' . $rsvp->guest_name,
            $admin,
            $admin->name,
            request()?->ip(),
        );

        return [
            'queued' => true,
            'skipped' => false,
            'guest_name' => (string) $rsvp->guest_name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function stats(): array
    {
        $windowStart = now()->subDay();
        $recent = AdminReminder::query()
            ->where('created_at', '>=', $windowStart)
            ->latest('created_at')
            ->limit(20)
            ->get();

        return [
            'last_24h' => [
                'total' => $recent->count(),
                'queued' => $recent->where('status', 'queued')->count(),
                'sent' => $recent->where('status', 'sent')->count(),
                'failed' => $recent->where('status', 'failed')->count(),
                'skipped' => $recent->where('status', 'skipped')->count(),
                'opened' => $recent->whereNotNull('opened_at')->count(),
                'clicked' => $recent->whereNotNull('clicked_at')->count(),
            ],
            'tracking' => [
                'open_click_tracking_supported' => false,
            ],
            'recent' => $this->mapRecentEntries($recent),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapRecentEntries(Collection $recent): array
    {
        return $recent->map(fn (AdminReminder $reminder): array => [
            'id' => $reminder->id,
            'rsvp_id' => $reminder->rsvp_id,
            'recipient_email' => $reminder->recipient_email,
            'status' => $reminder->status,
            'sent_at' => $reminder->sent_at?->toISOString(),
            'created_at' => $reminder->created_at?->toISOString(),
            'opened_at' => $reminder->opened_at?->toISOString(),
            'clicked_at' => $reminder->clicked_at?->toISOString(),
        ])->all();
    }

    private function createSkippedReminder(User $admin, Rsvp $rsvp): void
    {
        AdminReminder::query()->create([
            'invitation_id' => $rsvp->invitation_id,
            'rsvp_id' => $rsvp->id,
            'sent_by_user_id' => $admin->id,
            'recipient_email' => (string) $rsvp->guest_name,
            'status' => 'skipped',
            'error_message' => 'No valid recipient email for this RSVP.',
        ]);
    }

    private function extractEmailFromRsvp(Rsvp $rsvp): ?string
    {
        $email = filter_var((string) $rsvp->guest_name, FILTER_VALIDATE_EMAIL);
        return is_string($email) && $email !== '' ? $email : null;
    }
}
