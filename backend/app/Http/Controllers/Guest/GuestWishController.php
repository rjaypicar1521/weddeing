<?php

namespace App\Http\Controllers\Guest;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guest\FlagGuestWishRequest;
use App\Http\Requests\Guest\StoreGuestWishRequest;
use App\Services\GuestWishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestWishController extends Controller
{
    public function __construct(private readonly GuestWishService $guestWishService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $perPage = min(50, max(1, (int) $request->integer('per_page', 10)));
        $wishes = $this->guestWishService->list($invitationId, $perPage);

        return response()->json([
            'wishes' => $wishes->items(),
            'meta' => [
                'current_page' => $wishes->currentPage(),
                'last_page' => $wishes->lastPage(),
                'per_page' => $wishes->perPage(),
                'total' => $wishes->total(),
                'has_more' => $wishes->hasMorePages(),
            ],
        ]);
    }

    public function store(StoreGuestWishRequest $request): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $wish = $this->guestWishService->create($invitationId, $request->validated());

        return response()->json([
            'wish' => $wish,
        ], 201);
    }

    public function flag(FlagGuestWishRequest $request, int $id): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $wish = $this->guestWishService->flag($invitationId, $id);

        return response()->json([
            'wish' => $wish,
            'message' => 'Wish flagged.',
        ]);
    }
}

