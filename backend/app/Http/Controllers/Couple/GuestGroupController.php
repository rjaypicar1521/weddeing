<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\CreateTableGuestGroupsRequest;
use App\Http\Requests\Couple\StoreGuestGroupRequest;
use App\Http\Requests\Couple\UpdateGuestGroupRequest;
use App\Models\User;
use App\Services\AdminGuestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestGroupController extends Controller
{
    public function __construct(
        private readonly AdminGuestService $guestService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'groups' => $this->guestService->listGuestGroupsForUser($user),
        ]);
    }

    public function store(StoreGuestGroupRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'group' => $this->guestService->createGuestGroupForUser(
                $user,
                (string) $request->validated('name'),
            ),
            'message' => 'Guest group created.',
        ], 201);
    }

    public function update(UpdateGuestGroupRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'group' => $this->guestService->renameGuestGroupForUser(
                $user,
                $id,
                (string) $request->validated('name'),
            ),
            'message' => 'Guest group renamed.',
        ]);
    }

    public function regenerateCode(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'group' => $this->guestService->regenerateGuestGroupCodeForUser($user, $id),
            'message' => 'Group code regenerated.',
        ]);
    }

    public function createTableCodes(CreateTableGuestGroupsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $tableCount = (int) ($request->validated('table_count') ?? 20);
        $result = $this->guestService->createDefaultTableGroupsForUser($user, $tableCount);

        return response()->json([
            'created_count' => $result['created_count'],
            'existing_count' => $result['existing_count'],
            'groups' => $result['groups'],
            'message' => $result['created_count'] > 0
                ? "Created {$result['created_count']} table codes."
                : 'Table codes already exist.',
        ]);
    }
}
