<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\InviteAnalyticsRequest;
use App\Services\AdminInviteAnalyticsService;
use Illuminate\Http\JsonResponse;

class AdminInviteAnalyticsController extends Controller
{
    public function __construct(
        private readonly AdminInviteAnalyticsService $adminInviteAnalyticsService,
    ) {
    }

    public function invites(InviteAnalyticsRequest $request): JsonResponse
    {
        $range = (int) ($request->validated('range') ?? 7);
        $payload = $this->adminInviteAnalyticsService->getInviteAnalytics($range);

        return response()->json($payload);
    }
}
