<?php

namespace App\Http\Controllers\Guest;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guest\StoreGuestRsvpRequest;
use App\Services\GuestRsvpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestRsvpController extends Controller
{
    public function __construct(private readonly GuestRsvpService $guestRsvpService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $guestGroupId = $request->attributes->get('guest_group_id');
        $tokenHash = (string) $request->attributes->get('guest_token_hash');
        $response = $this->guestRsvpService->getSubmissionState(
            invitationId: $invitationId,
            guestGroupId: is_int($guestGroupId) ? $guestGroupId : null,
            tokenHash: $tokenHash,
        );

        return response()->json($response);
    }

    public function store(StoreGuestRsvpRequest $request): JsonResponse
    {
        $invitationId = (int) $request->attributes->get('guest_invitation_id');
        $guestGroupId = $request->attributes->get('guest_group_id');
        $tokenHash = (string) $request->attributes->get('guest_token_hash');

        $rsvp = $this->guestRsvpService->submit(
            invitationId: $invitationId,
            guestGroupId: is_int($guestGroupId) ? $guestGroupId : null,
            tokenHash: $tokenHash,
            ipAddress: $request->ip(),
            payload: $request->validated(),
        );

        return response()->json([
            'rsvp' => $rsvp,
            'confirmation_code' => $rsvp->confirmation_code,
        ], 201);
    }
}
