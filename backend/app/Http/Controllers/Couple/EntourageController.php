<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\ReorderEntourageRequest;
use App\Http\Requests\Couple\StoreEntourageMemberRequest;
use App\Http\Requests\Couple\UpdateEntourageMemberRequest;
use App\Models\User;
use App\Services\EntourageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EntourageController extends Controller
{
    public function __construct(private readonly EntourageService $entourageService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'members' => $this->entourageService->list($user),
        ]);
    }

    public function store(StoreEntourageMemberRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $member = $this->entourageService->create($user, $request->validated());

        return response()->json([
            'member' => $member,
        ], 201);
    }

    public function update(UpdateEntourageMemberRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $member = $this->entourageService->update($user, $id, $request->validated());

        return response()->json([
            'member' => $member,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->entourageService->delete($user, $id);

        return response()->json([], 204);
    }

    public function reorder(ReorderEntourageRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array<int, int> $ids */
        $ids = $request->validated('ids');

        $this->entourageService->reorder($user, $ids);

        return response()->json([
            'message' => 'Entourage members reordered successfully.',
        ]);
    }
}
