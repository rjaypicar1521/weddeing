<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkInviteGuestsRequest;
use App\Http\Requests\Admin\ListGuestsRequest;
use App\Http\Requests\Admin\UpdateGuestStatusRequest;
use App\Http\Requests\Couple\MoveGuestToGroupRequest;
use App\Models\User;
use App\Services\AdminGuestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GuestController extends Controller
{
    public function __construct(
        private readonly AdminGuestService $guestService,
    ) {
    }

    public function index(ListGuestsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $guests = $this->guestService->listGuestsForUser($user, $request->validated());

        return response()->json([
            'guests' => $guests->items(),
            'meta' => [
                'current_page' => $guests->currentPage(),
                'last_page' => $guests->lastPage(),
                'per_page' => $guests->perPage(),
                'total' => $guests->total(),
                'has_more' => $guests->hasMorePages(),
            ],
        ]);
    }

    public function bulkInvite(BulkInviteGuestsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $result = $this->guestService->bulkInviteForUser($user, $request->file('file'), $request->ip());
        } catch (HttpException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
        }

        return response()->json([
            'added' => $result['added'],
            'queued' => $result['queued'],
            'preview' => $result['preview'],
            'message' => "{$result['added']} new guests added.",
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->guestService->softDeleteGuestForUser($user, $id, $request->ip());

        return response()->json([], 204);
    }

    public function updateStatus(UpdateGuestStatusRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $guest = $this->guestService->updateStatusForUser($user, $id, (string) $request->validated('status'));

        return response()->json([
            'guest' => [
                'id' => $guest->id,
                'guest_name' => $guest->guest_name,
                'email' => $guest->email,
                'guest_status' => $guest->guest_status,
            ],
            'message' => 'Guest status updated.',
        ]);
    }

    public function moveToGroup(MoveGuestToGroupRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $guest = $this->guestService->moveGuestToGroupForUser(
            $user,
            $id,
            (int) $request->validated('guest_group_id'),
        );

        return response()->json([
            'guest' => [
                'id' => $guest->id,
                'guest_name' => $guest->guest_name,
                'guest_group_id' => $guest->guest_group_id,
                'group_name' => $guest->guestGroup?->name,
                'group_code' => $guest->guestGroup?->access_code,
            ],
            'message' => 'Guest moved to a new table.',
        ]);
    }
}
