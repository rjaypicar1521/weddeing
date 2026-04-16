<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ActivityLogService
{
    public function log(
        string $action,
        string $details,
        ?User $user = null,
        ?string $userName = null,
        ?string $ip = null,
    ): void {
        ActivityLog::query()->create([
            'user_id' => $user?->id,
            'user_name' => $userName ?: ($user?->name ?? 'System'),
            'action' => $action,
            'category' => $this->resolveCategory($action),
            'details' => $details,
            'ip' => $ip,
        ]);
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $type = (string) ($filters['type'] ?? 'all');
        $search = trim((string) ($filters['search'] ?? ''));

        $query = ActivityLog::query()
            ->select(['id', 'user_name', 'action', 'details', 'ip', 'created_at'])
            ->latest('created_at');

        if ($type !== '' && $type !== 'all') {
            $query->where('category', $type);
        }

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('user_name', 'like', '%' . $search . '%')
                    ->orWhere('details', 'like', '%' . $search . '%');
            });
        }

        return $query->paginate(20)->withQueryString();
    }

    private function resolveCategory(string $action): string
    {
        return match ($action) {
            'rsvp_submitted', 'rsvp_updated' => 'rsvps',
            'invite_sent', 'guest_added', 'guest_deleted' => 'invites',
            'reminder_sent' => 'reminders',
            default => 'all',
        };
    }
}
