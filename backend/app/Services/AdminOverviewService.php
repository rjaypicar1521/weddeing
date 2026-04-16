<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\Rsvp;

class AdminOverviewService
{
    /**
     * @return array<string, int|string>
     */
    public function getOverview(): array
    {
        $guestsInvited = Rsvp::query()->count();
        $rsvpsReceived = Rsvp::query()->whereNotNull('submitted_at')->count();
        $attending = Rsvp::query()->where('attending', true)->count();
        $declined = Rsvp::query()
            ->where('attending', false)
            ->whereNotNull('submitted_at')
            ->count();
        $pending = Rsvp::query()
            ->where('attending', false)
            ->whereNull('submitted_at')
            ->count();

        // No dedicated invite-send/open tracking exists yet in current schema; use invitation-level proxy metrics for now.
        $invitesSent = Invitation::query()->count();
        $invitesOpened = Invitation::query()->where('status', 'published')->count();

        $openRate = $invitesSent > 0
            ? number_format(($invitesOpened / $invitesSent) * 100, 1) . '%'
            : '0.0%';

        return [
            'guests_invited' => $guestsInvited,
            'rsvps_received' => $rsvpsReceived,
            'attending' => $attending,
            'declined' => $declined,
            'pending' => $pending,
            'invites_sent' => $invitesSent,
            'invites_opened' => $invitesOpened,
            'avg_open_rate' => $openRate,
        ];
    }
}
