<?php

namespace App\Services;

use App\Events\GuestRsvpUpdated;
use App\Models\Invitation;
use App\Models\RsvpAudit;
use App\Models\RsvpNote;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CoupleRsvpService
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listForUser(User $user, array $filters): LengthAwarePaginator
    {
        $invitation = $this->resolveInvitation($user);

        $status = (string) ($filters['status'] ?? 'all');
        $search = trim((string) ($filters['search'] ?? ''));

        $query = Rsvp::query()
            ->where('invitation_id', $invitation->id)
            ->with(['notes.user:id,name'])
            ->select([
                'id',
                'guest_name',
                'attending',
                'plus_one_name',
                'meal_preference',
                'transport',
                'favorite_memory',
                'message_to_couple',
                'submitted_at',
                'manually_overridden_at',
                'manually_overridden_by',
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        $this->applyStatusFilter($query, $status);

        if ($search !== '') {
            $query->where('guest_name', 'like', '%' . $search . '%');
        }

        return $query->paginate(20)->withQueryString();
    }

    /**
     * @param array<string, mixed> $payload
     */
    /**
     * @return array{rsvp: Rsvp, notification_sent: bool}
     */
    public function updateForUser(User $user, int $rsvpId, array $payload): array
    {
        $rsvp = $this->resolveAccessibleRsvp($user, $rsvpId);

        /** @var array<string, mixed> $beforePayload */
        $beforePayload = Arr::only($rsvp->toArray(), [
            'attending',
            'plus_one_name',
            'meal_preference',
            'transport',
            'favorite_memory',
            'message_to_couple',
        ]);

        $updatePayload = Arr::only($payload, [
            'attending',
            'plus_one_name',
            'meal_preference',
            'transport',
            'favorite_memory',
            'message_to_couple',
        ]);

        if (array_key_exists('attending', $updatePayload) && $updatePayload['attending'] === false) {
            $updatePayload['plus_one_name'] = null;
        }

        $afterPayload = [];

        DB::transaction(function () use ($rsvp, $user, $updatePayload, $beforePayload, &$afterPayload): void {
            $rsvp->fill($updatePayload);
            $rsvp->manually_overridden_at = now();
            $rsvp->manually_overridden_by = $user->id;
            $rsvp->save();

            $afterPayload = Arr::only($rsvp->fresh()->toArray(), [
                'attending',
                'plus_one_name',
                'meal_preference',
                'transport',
                'favorite_memory',
                'message_to_couple',
            ]);

            RsvpAudit::query()->create([
                'rsvp_id' => $rsvp->id,
                'user_id' => $user->id,
                'before_payload' => $beforePayload,
                'after_payload' => $afterPayload,
            ]);
        });

        $changedFields = [];
        foreach (array_keys($beforePayload) as $field) {
            if (($beforePayload[$field] ?? null) !== ($afterPayload[$field] ?? null)) {
                $changedFields[] = (string) $field;
            }
        }

        $freshRsvp = $rsvp->fresh(['notes.user:id,name']);

        $notificationSent = false;
        if ($changedFields !== [] && $freshRsvp) {
            GuestRsvpUpdated::dispatch($freshRsvp, $changedFields);
            $this->activityLogService->log(
                'rsvp_updated',
                $freshRsvp->guest_name . ' updated fields: ' . implode(', ', $changedFields),
                $user,
                $user->name,
                request()?->ip(),
            );
            $notificationSent = true;
        }

        return [
            'rsvp' => $freshRsvp ?? $rsvp,
            'notification_sent' => $notificationSent,
        ];
    }

    public function addNoteForUser(User $user, int $rsvpId, string $note): Collection
    {
        $rsvp = $this->resolveAccessibleRsvp($user, $rsvpId);

        RsvpNote::query()->create([
            'rsvp_id' => $rsvp->id,
            'user_id' => $user->id,
            'note' => $note,
        ]);

        return $rsvp->notes()->with('user:id,name')->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function statsForUser(User $user): array
    {
        $invitation = $this->resolveInvitation($user);

        $baseQuery = Rsvp::query()->where('invitation_id', $invitation->id);

        $total = (clone $baseQuery)->count();
        $attending = (clone $baseQuery)->where('attending', true)->count();
        $declined = (clone $baseQuery)
            ->where('attending', false)
            ->whereNotNull('submitted_at')
            ->count();
        $pending = (clone $baseQuery)
            ->where('attending', false)
            ->whereNull('submitted_at')
            ->count();
        $plusOnes = (clone $baseQuery)
            ->where('attending', true)
            ->whereNotNull('plus_one_name')
            ->where('plus_one_name', '!=', '')
            ->count();

        $mealCounts = (clone $baseQuery)
            ->whereNotNull('meal_preference')
            ->selectRaw('meal_preference, COUNT(*) as aggregate_count')
            ->groupBy('meal_preference')
            ->pluck('aggregate_count', 'meal_preference')
            ->toArray();

        $transportCounts = (clone $baseQuery)
            ->whereNotNull('transport')
            ->selectRaw('transport, COUNT(*) as aggregate_count')
            ->groupBy('transport')
            ->pluck('aggregate_count', 'transport')
            ->toArray();

        return [
            'total' => $total,
            'attending' => $attending,
            'declined' => $declined,
            'pending' => $pending,
            'total_with_plus_ones' => $attending + $plusOnes,
            'meal_counts' => $mealCounts,
            'transport_counts' => $transportCounts,
        ];
    }

    /**
     * @return array<int, array<int, string>>
     */
    public function exportRowsForUser(User $user, bool $onlyAttending): array
    {
        $invitation = $this->resolveInvitation($user);

        $query = Rsvp::query()
            ->where('invitation_id', $invitation->id)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        if ($onlyAttending) {
            $query->where('attending', true);
        }

        return $query->get()->map(function (Rsvp $rsvp) {
            return [
                (string) $rsvp->guest_name,
                $rsvp->attending ? 'Yes' : 'No',
                (string) ($rsvp->plus_one_name ?? ''),
                (string) ($rsvp->meal_preference ?? ''),
                (string) ($rsvp->transport ?? ''),
                (string) ($rsvp->favorite_memory ?? ''),
                (string) ($rsvp->message_to_couple ?? ''),
                $rsvp->submitted_at?->toDateTimeString() ?? '',
            ];
        })->all();
    }

    private function applyStatusFilter(Builder $query, string $status): void
    {
        if ($status === 'attending') {
            $query->where('attending', true);
            return;
        }

        if ($status === 'declined') {
            $query->where('attending', false)->whereNotNull('submitted_at');
            return;
        }

        if ($status === 'pending') {
            $query->where('attending', false)->whereNull('submitted_at');
        }
    }

    private function resolveInvitation(User $user): Invitation
    {
        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        return $invitation;
    }

    private function resolveAccessibleRsvp(User $user, int $rsvpId): Rsvp
    {
        $rsvp = Rsvp::query()->find($rsvpId);

        if (! $rsvp) {
            throw new HttpException(404, 'RSVP not found.');
        }

        if ($user->is_admin) {
            return $rsvp;
        }

        $invitation = $this->resolveInvitation($user);
        if ($rsvp->invitation_id !== $invitation->id) {
            throw new HttpException(403, 'You do not have permission to edit this RSVP.');
        }

        return $rsvp;
    }
}
