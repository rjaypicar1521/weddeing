<?php

namespace App\Services;

use App\Models\Wish;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GuestWishService
{
    public function list(int $invitationId, int $perPage = 10): LengthAwarePaginator
    {
        return Wish::query()
            ->where('invitation_id', $invitationId)
            ->where('is_flagged', false)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(int $invitationId, array $payload): Wish
    {
        return Wish::query()->create([
            'invitation_id' => $invitationId,
            'guest_name' => (string) $payload['guest_name'],
            'message' => (string) $payload['message'],
            'is_flagged' => false,
        ])->fresh();
    }

    public function flag(int $invitationId, int $wishId): Wish
    {
        $wish = Wish::query()
            ->where('invitation_id', $invitationId)
            ->where('is_flagged', false)
            ->find($wishId);

        if (! $wish) {
            throw new HttpException(404, 'Wish not found.');
        }

        $wish->forceFill([
            'is_flagged' => true,
        ])->save();

        return $wish->fresh();
    }
}

