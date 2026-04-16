<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\StoreInvitationRequest;
use App\Http\Requests\Couple\UpdateInvitationRequest;
use App\Models\User;
use App\Services\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitationService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $invitation = $this->invitationService->getByUser($user);

        return response()->json([
            'invitation' => $invitation,
        ]);
    }

    public function store(StoreInvitationRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $invitation = $this->invitationService->createForUser($user);

        return response()->json([
            'message' => 'Invitation created successfully.',
            'invitation' => $invitation,
        ], 201);
    }

    public function update(UpdateInvitationRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $invitation = $this->invitationService->updateWeddingDetails($user, $request->validated());

        return response()->json([
            'message' => 'Invitation updated successfully.',
            'invitation' => $invitation,
        ]);
    }

    public function regenerateCode(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $result = $this->invitationService->regenerateGuestCode($user);

        return response()->json($result);
    }

    public function publish(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $invitation = $this->invitationService->publish($user);

        return response()->json([
            'message' => 'Invitation published successfully.',
            'invitation' => $invitation,
        ]);
    }

    public function unpublish(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $invitation = $this->invitationService->unpublish($user);

        return response()->json([
            'message' => 'Invitation unpublished successfully.',
            'invitation' => $invitation,
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $preview = $this->invitationService->preview($user);

        return response()->json($preview);
    }
}

