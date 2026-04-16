<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\ReorderLoveStoryRequest;
use App\Http\Requests\Couple\StoreLoveStoryChapterRequest;
use App\Http\Requests\Couple\UpdateLoveStoryChapterRequest;
use App\Models\User;
use App\Services\LoveStoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoveStoryController extends Controller
{
    public function __construct(private readonly LoveStoryService $loveStoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'chapters' => $this->loveStoryService->list($user),
        ]);
    }

    public function store(StoreLoveStoryChapterRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $chapter = $this->loveStoryService->create($user, $request->validated());

        return response()->json([
            'chapter' => $chapter,
        ], 201);
    }

    public function update(UpdateLoveStoryChapterRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $chapter = $this->loveStoryService->update($user, $id, $request->validated());

        return response()->json([
            'chapter' => $chapter,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->loveStoryService->delete($user, $id);

        return response()->json([], 204);
    }

    public function reorder(ReorderLoveStoryRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array<int, int> $ids */
        $ids = $request->validated('ids');

        $this->loveStoryService->reorder($user, $ids);

        return response()->json([
            'message' => 'Love story chapters reordered successfully.',
        ]);
    }
}
