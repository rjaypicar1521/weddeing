<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListActivityRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class AdminActivityController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {
    }

    public function index(ListActivityRequest $request): JsonResponse
    {
        $logs = $this->activityLogService->list($request->validated());

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'has_more' => $logs->hasMorePages(),
            ],
        ]);
    }
}
