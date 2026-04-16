<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkInviteGuestsRequest;
use App\Http\Requests\Admin\ListGuestsRequest;
use App\Http\Requests\Admin\UpdateGuestStatusRequest;
use App\Models\User;
use App\Services\AdminGuestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminGuestController extends Controller
{
    public function __construct(
        private readonly AdminGuestService $adminGuestService,
    ) {
    }

    public function index(ListGuestsRequest $request): JsonResponse
    {
        $guests = $this->adminGuestService->listGuests($request->validated());

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
        /** @var User $admin */
        $admin = $request->user();

        try {
            $result = $this->adminGuestService->bulkInvite($admin, $request->file('file'), $request->ip());
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
        /** @var User $admin */
        $admin = $request->user();

        $this->adminGuestService->softDeleteGuest($id, $admin, $request->ip());

        return response()->json([], 204);
    }

    public function updateStatus(UpdateGuestStatusRequest $request, int $id): JsonResponse
    {
        $guest = $this->adminGuestService->updateStatus($id, (string) $request->validated('status'));

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
}
