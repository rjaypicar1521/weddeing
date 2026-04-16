<?php

namespace App\Http\Controllers\Guest;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guest\ValidateGuestCodeRequest;
use App\Services\GuestAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestAccessController extends Controller
{
    public function __construct(private readonly GuestAccessService $guestAccessService)
    {
    }

    public function validateCode(ValidateGuestCodeRequest $request): JsonResponse
    {
        $result = $this->guestAccessService->validateCode((string) $request->validated('code'));

        return response()->json($result);
    }

    public function showInvitation(Request $request): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $guestGroupId = $request->attributes->get('guest_group_id');
        $payload = $this->guestAccessService->getInvitationPayload(
            $invitationId,
            is_int($guestGroupId) ? $guestGroupId : null,
        );

        return response()->json($payload);
    }
}
