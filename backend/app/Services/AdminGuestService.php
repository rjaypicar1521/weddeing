<?php

namespace App\Services;

use App\Jobs\SendGuestInviteEmail;
use App\Models\GuestGroup;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminGuestService
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listGuests(array $filters): LengthAwarePaginator
    {
        return $this->buildGuestPaginator($this->baseGuestQuery(), $filters);
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listGuestsForUser(User $user, array $filters): LengthAwarePaginator
    {
        $invitation = $this->resolveInvitation($user);

        return $this->buildGuestPaginator(
            $this->baseGuestQuery()->where('invitation_id', $invitation->id),
            $filters,
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listGuestGroupsForUser(User $user): array
    {
        $invitation = $this->resolveInvitation($user);

        return GuestGroup::query()
            ->where('invitation_id', $invitation->id)
            ->withCount('guests')
            ->withCount([
                'guests as submitted_count' => fn (Builder $query) => $query->whereNotNull('submitted_at'),
                'guests as attending_count' => fn (Builder $query) => $query->where('attending', true)->whereNotNull('submitted_at'),
                'guests as pending_count' => fn (Builder $query) => $query->whereNull('submitted_at'),
            ])
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (GuestGroup $group): array => $this->transformGuestGroup($group))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function createGuestGroupForUser(User $user, string $name): array
    {
        $invitation = $this->resolveInvitation($user);
        $normalizedName = $this->normalizeGuestGroupName($name);
        $this->ensureGuestGroupNameIsUnique($invitation, $normalizedName);

        $group = GuestGroup::query()->create([
            'invitation_id' => $invitation->id,
            'name' => $normalizedName,
            'access_code' => Invitation::generateUniqueGuestCode(),
            'status' => 'active',
            'is_default' => false,
        ]);

        return $this->transformGuestGroup($group->loadCount('guests'));
    }

    /**
     * @return array{created_count:int, existing_count:int, groups:array<int, array<string, mixed>>}
     */
    public function createDefaultTableGroupsForUser(User $user, int $tableCount = 20): array
    {
        $invitation = $this->resolveInvitation($user);
        $createdCount = 0;
        $existingCount = 0;

        DB::transaction(function () use ($invitation, $tableCount, &$createdCount, &$existingCount): void {
            for ($index = 1; $index <= $tableCount; $index++) {
                $name = sprintf('Table %02d', $index);

                $group = GuestGroup::query()
                    ->where('invitation_id', $invitation->id)
                    ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->first();

                if ($group) {
                    $existingCount++;
                    continue;
                }

                GuestGroup::query()->create([
                    'invitation_id' => $invitation->id,
                    'name' => $name,
                    'access_code' => Invitation::generateUniqueGuestCode(),
                    'status' => 'active',
                    'is_default' => false,
                ]);

                $createdCount++;
            }
        });

        return [
            'created_count' => $createdCount,
            'existing_count' => $existingCount,
            'groups' => $this->listGuestGroupsForUser($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function renameGuestGroupForUser(User $user, int $guestGroupId, string $name): array
    {
        $invitation = $this->resolveInvitation($user);
        $group = $this->resolveAccessibleGroup($invitation, $guestGroupId);
        $normalizedName = $this->normalizeGuestGroupName($name);
        $this->ensureGuestGroupNameIsUnique($invitation, $normalizedName, $group->id);

        $group->name = $normalizedName;
        $group->save();

        return $this->transformGuestGroup($group->loadCount('guests'));
    }

    /**
     * @return array<string, mixed>
     */
    public function regenerateGuestGroupCodeForUser(User $user, int $guestGroupId): array
    {
        $invitation = $this->resolveInvitation($user);
        $group = $this->resolveAccessibleGroup($invitation, $guestGroupId);
        $group->access_code = Invitation::generateUniqueGuestCode();
        $group->save();

        if ($group->is_default) {
            $invitation->guest_code = $group->access_code;
            $invitation->save();
        }

        return $this->transformGuestGroup($group->loadCount('guests'));
    }

    /**
     * @return array{added:int, queued:int, preview:array<int, array{name:string, email:string, group_name:?string}>}
     */
    public function bulkInvite(User $admin, UploadedFile $file, ?string $ip = null): array
    {
        $invitation = $this->resolveInvitation($admin);
        return $this->bulkInviteIntoInvitation($admin, $invitation, $file, $ip);
    }

    /**
     * @return array{added:int, queued:int, preview:array<int, array{name:string, email:string, group_name:?string}>}
     */
    public function bulkInviteForUser(User $user, UploadedFile $file, ?string $ip = null): array
    {
        $invitation = $this->resolveInvitation($user);

        return $this->bulkInviteIntoInvitation($user, $invitation, $file, $ip);
    }

    public function softDeleteGuestForUser(User $user, int $guestId, ?string $ip = null): void
    {
        $guest = $this->resolveAccessibleGuest($user, $guestId);
        $guestName = $guest->guest_name;
        $guest->delete();

        $this->activityLogService->log(
            'guest_deleted',
            "Guest deleted: {$guestName}",
            $user,
            $user->name,
            $ip,
        );
    }

    public function updateStatusForUser(User $user, int $guestId, string $status): Rsvp
    {
        $guest = $this->resolveAccessibleGuest($user, $guestId);
        $guest->guest_status = $status;
        $guest->save();

        return $guest->fresh();
    }

    public function moveGuestToGroupForUser(User $user, int $guestId, int $guestGroupId): Rsvp
    {
        $invitation = $this->resolveInvitation($user);
        $guest = $this->resolveAccessibleGuest($user, $guestId);
        $group = $this->resolveAccessibleGroup($invitation, $guestGroupId);

        $guest->guest_group_id = $group->id;
        $guest->save();

        return $guest->fresh(['guestGroup']);
    }

    /**
     * @return array{added:int, queued:int, preview:array<int, array{name:string, email:string, group_name:?string}>}
     */
    private function bulkInviteIntoInvitation(User $actor, Invitation $invitation, UploadedFile $file, ?string $ip = null): array
    {
        $rows = $this->parseCsv($file);
        $guestLimit = $this->guestLimit((string) $actor->plan);

        $existingEmails = Rsvp::query()
            ->where('invitation_id', $invitation->id)
            ->whereNotNull('email')
            ->pluck('email')
            ->map(static fn (string $email): string => strtolower($email))
            ->all();

        $existingEmailLookup = array_fill_keys($existingEmails, true);
        $incomingUnique = [];
        $newRows = [];

        foreach ($rows as $row) {
            $email = strtolower($row['email']);
            if (isset($existingEmailLookup[$email]) || isset($incomingUnique[$email])) {
                continue;
            }

            $incomingUnique[$email] = true;
            $newRows[] = $row;
        }

        $existingCount = Rsvp::query()
            ->where('invitation_id', $invitation->id)
            ->count();

        if ($existingCount + count($newRows) > $guestLimit) {
            throw new HttpException(
                429,
                "Guest limit reached for your plan. Limit: {$guestLimit} guests."
            );
        }

        $added = 0;
        $queued = 0;

        DB::transaction(function () use ($newRows, $invitation, &$added, &$queued): void {
            foreach ($newRows as $row) {
                $guestGroup = $this->resolveOrCreateGroup($invitation, $row['group_name'] ?? null);
                $guest = Rsvp::query()->create([
                    'invitation_id' => $invitation->id,
                    'guest_group_id' => $guestGroup->id,
                    'guest_name' => $row['name'],
                    'email' => $row['email'],
                    'guest_status' => 'invited',
                    'invited_at' => now(),
                    'attending' => false,
                    'confirmation_code' => $this->generateConfirmationCode(),
                ]);

                SendGuestInviteEmail::dispatch($guest->id);
                $added++;
                $queued++;
            }
        });

        if ($added > 0) {
            $this->activityLogService->log(
                'guest_added',
                "CSV import: {$added} new guests added",
                $actor,
                $actor->name,
                $ip,
            );
        }

        return [
            'added' => $added,
            'queued' => $queued,
            'preview' => array_slice($rows, 0, 20),
        ];
    }

    public function softDeleteGuest(int $guestId, ?User $admin = null, ?string $ip = null): void
    {
        $guest = Rsvp::query()->find($guestId);
        if (! $guest) {
            throw new HttpException(404, 'Guest not found.');
        }

        $guestName = $guest->guest_name;
        $guest->delete();

        $this->activityLogService->log(
            'guest_deleted',
            "Guest deleted: {$guestName}",
            $admin,
            $admin?->name,
            $ip,
        );
    }

    public function updateStatus(int $guestId, string $status): Rsvp
    {
        $guest = Rsvp::query()->find($guestId);
        if (! $guest) {
            throw new HttpException(404, 'Guest not found.');
        }

        $guest->guest_status = $status;
        $guest->save();

        return $guest->fresh();
    }

    /**
     * @return array<int, array{name:string, email:string, group_name:?string}>
     */
    private function parseCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
        if (! $handle) {
            throw new HttpException(422, 'Unable to read CSV file.');
        }

        $rows = [];
        $line = 0;
        $headerMap = null;

        while (($data = fgetcsv($handle)) !== false) {
            $line++;
            if ($data === [null] || $data === []) {
                continue;
            }

            if ($line === 1) {
                $normalizedHeader = array_map(
                    static fn ($value): string => strtolower(trim((string) $value)),
                    $data,
                );
                if (in_array('email', $normalizedHeader, true) && in_array('name', $normalizedHeader, true)) {
                    $headerMap = array_flip($normalizedHeader);
                    continue;
                }
            }

            $groupName = null;
            if (is_array($headerMap)) {
                $name = trim((string) ($data[$headerMap['name']] ?? ''));
                $email = trim((string) ($data[$headerMap['email']] ?? ''));
                $groupName = trim((string) ($data[$headerMap['group_name'] ?? $headerMap['table_name'] ?? $headerMap['group'] ?? -1] ?? ''));
            } elseif (count($data) >= 3) {
                $groupName = trim((string) ($data[0] ?? ''));
                $name = trim((string) ($data[1] ?? ''));
                $email = trim((string) ($data[2] ?? ''));
            } else {
                $name = trim((string) ($data[0] ?? ''));
                $email = trim((string) ($data[1] ?? ''));
            }

            if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            $rows[] = [
                'name' => $name,
                'email' => strtolower($email),
                'group_name' => $groupName !== '' ? $groupName : null,
            ];
        }

        fclose($handle);

        if ($rows === []) {
            throw new HttpException(422, 'CSV contains no valid guest rows.');
        }

        return $rows;
    }

    private function resolveInvitation(User $admin): Invitation
    {
        $invitation = $admin->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this account.');
        }

        return $invitation;
    }

    private function resolveAccessibleGuest(User $user, int $guestId): Rsvp
    {
        $guest = Rsvp::query()->find($guestId);
        if (! $guest) {
            throw new HttpException(404, 'Guest not found.');
        }

        if ($user->is_admin) {
            return $guest;
        }

        $invitation = $this->resolveInvitation($user);
        if ($guest->invitation_id !== $invitation->id) {
            throw new HttpException(403, 'You do not have permission to manage this guest.');
        }

        return $guest;
    }

    private function resolveAccessibleGroup(Invitation $invitation, int $guestGroupId): GuestGroup
    {
        $group = GuestGroup::query()
            ->where('invitation_id', $invitation->id)
            ->find($guestGroupId);

        if (! $group) {
            throw new HttpException(404, 'Guest group not found.');
        }

        return $group;
    }

    private function baseGuestQuery(): Builder
    {
        return Rsvp::query()
            ->with([
                'invitation:id,slug,partner1_name,partner2_name',
                'guestGroup:id,invitation_id,name,access_code',
            ])
            ->select([
                'id',
                'invitation_id',
                'guest_group_id',
                'guest_name',
                'email',
                'guest_status',
                'attending',
                'submitted_at',
                'invited_at',
                'created_at',
            ])
            ->orderByDesc('invited_at')
            ->orderByDesc('created_at');
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function buildGuestPaginator(Builder $query, array $filters): LengthAwarePaginator
    {
        $status = (string) ($filters['status'] ?? '');
        $search = trim((string) ($filters['search'] ?? ''));

        $this->applyStatusFilter($query, $status);

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('guest_name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        return $query->paginate(20)->through(function (Rsvp $guest): array {
            return [
                'id' => $guest->id,
                'invitation_id' => $guest->invitation_id,
                'guest_group_id' => $guest->guest_group_id,
                'name' => $guest->guest_name,
                'email' => $guest->email,
                'status' => $this->deriveStatus($guest),
                'guest_status' => $guest->guest_status,
                'invited_at' => $guest->invited_at?->toISOString(),
                'submitted_at' => $guest->submitted_at?->toISOString(),
                'created_at' => $guest->created_at?->toISOString(),
                'group_name' => $guest->guestGroup?->name,
                'group_code' => $guest->guestGroup?->access_code,
            ];
        });
    }

    private function resolveOrCreateGroup(Invitation $invitation, ?string $groupName): GuestGroup
    {
        $normalizedName = trim((string) $groupName);
        if ($normalizedName === '') {
            return $invitation->defaultGuestGroup()->firstOrFail();
        }

        $existingGroup = GuestGroup::query()
            ->where('invitation_id', $invitation->id)
            ->whereRaw('LOWER(name) = ?', [strtolower($normalizedName)])
            ->first();

        if ($existingGroup) {
            return $existingGroup;
        }

        return GuestGroup::query()->create([
            'invitation_id' => $invitation->id,
            'name' => $normalizedName,
            'access_code' => Invitation::generateUniqueGuestCode(),
            'status' => 'active',
            'is_default' => false,
        ]);
    }

    private function normalizeGuestGroupName(string $name): string
    {
        $normalizedName = trim($name);
        if ($normalizedName === '') {
            throw new HttpException(422, 'Guest group name is required.');
        }

        return $normalizedName;
    }

    private function ensureGuestGroupNameIsUnique(Invitation $invitation, string $name, ?int $ignoreId = null): void
    {
        $query = GuestGroup::query()
            ->where('invitation_id', $invitation->id)
            ->whereRaw('LOWER(name) = ?', [strtolower($name)]);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw new HttpException(422, 'A guest group with that name already exists.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transformGuestGroup(GuestGroup $group): array
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'access_code' => $group->access_code,
            'status' => $group->status,
            'is_default' => $group->is_default,
            'guest_count' => (int) ($group->guests_count ?? 0),
            'submitted_count' => (int) ($group->submitted_count ?? 0),
            'attending_count' => (int) ($group->attending_count ?? 0),
            'pending_count' => (int) ($group->pending_count ?? 0),
        ];
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

        if ($status === 'rsvp-pending') {
            $query
                ->where('attending', false)
                ->whereNull('submitted_at')
                ->where('guest_status', 'rsvp-pending');
            return;
        }

        if ($status === 'invited') {
            $query
                ->where('attending', false)
                ->whereNull('submitted_at')
                ->whereIn('guest_status', ['invited', 'contacted', 'no_reply']);
        }
    }

    private function deriveStatus(Rsvp $guest): string
    {
        if ($guest->attending) {
            return 'attending';
        }

        if (! $guest->attending && $guest->submitted_at) {
            return 'declined';
        }

        return (string) $guest->guest_status;
    }

    private function generateConfirmationCode(): string
    {
        $characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($index = 0; $index < 6; $index++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
        } while (Rsvp::query()->where('confirmation_code', $code)->exists());

        return $code;
    }

    private function guestLimit(string $plan): int
    {
        return $plan === 'premium' ? 250 : 25;
    }
}
