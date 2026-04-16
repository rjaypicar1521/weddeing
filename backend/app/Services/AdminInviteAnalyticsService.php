<?php

namespace App\Services;

use App\Models\AdminReminder;

class AdminInviteAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function getInviteAnalytics(int $rangeDays = 7): array
    {
        $rangeDays = in_array($rangeDays, [7, 30], true) ? $rangeDays : 7;
        $startDate = now()->subDays($rangeDays - 1)->startOfDay();

        $sentCount = AdminReminder::query()
            ->where('status', 'sent')
            ->count();

        $openedQuery = AdminReminder::query()
            ->whereNotNull('opened_at');

        $openedCount = (clone $openedQuery)->count();
        $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 1) : 0.0;

        $avgDaysToOpen = (clone $openedQuery)
            ->whereNotNull('sent_at')
            ->get(['sent_at', 'opened_at'])
            ->avg(function (AdminReminder $reminder): float {
                if (! $reminder->sent_at || ! $reminder->opened_at) {
                    return 0.0;
                }

                return max(0.0, $reminder->sent_at->diffInSeconds($reminder->opened_at) / 86400);
            });

        $openedToday = (clone $openedQuery)
            ->whereDate('opened_at', now()->toDateString())
            ->count();

        $deviceCounts = (clone $openedQuery)
            ->selectRaw('open_device, COUNT(*) as aggregate_count')
            ->groupBy('open_device')
            ->pluck('aggregate_count', 'open_device');

        $mobileCount = (int) ($deviceCounts['mobile'] ?? 0);
        $desktopCount = (int) ($deviceCounts['desktop'] ?? 0);

        $timeline = [];
        for ($offset = 0; $offset < $rangeDays; $offset++) {
            $date = $startDate->copy()->addDays($offset)->toDateString();
            $timeline[$date] = [
                'date' => $date,
                'opens' => 0,
                'mobile' => 0,
                'desktop' => 0,
            ];
        }

        $timelineRows = AdminReminder::query()
            ->whereNotNull('opened_at')
            ->where('opened_at', '>=', $startDate)
            ->get(['opened_at', 'open_device']);

        foreach ($timelineRows as $row) {
            $date = $row->opened_at?->toDateString();
            if (! $date || ! array_key_exists($date, $timeline)) {
                continue;
            }

            $timeline[$date]['opens']++;

            if ($row->open_device === 'mobile') {
                $timeline[$date]['mobile']++;
            } elseif ($row->open_device === 'desktop') {
                $timeline[$date]['desktop']++;
            }
        }

        return [
            'total_sent' => $sentCount,
            'total_opened' => $openedCount,
            'open_rate' => $openRate,
            'avg_days_to_open' => round((float) ($avgDaysToOpen ?? 0.0), 1),
            'opened_today' => $openedToday,
            'by_device' => [
                'mobile' => $mobileCount,
                'desktop' => $desktopCount,
            ],
            'timeline' => array_values($timeline),
            'range_days' => $rangeDays,
        ];
    }
}
