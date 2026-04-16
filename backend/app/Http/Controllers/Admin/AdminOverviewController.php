<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminOverviewService;
use Illuminate\Http\JsonResponse;

class AdminOverviewController extends Controller
{
    public function __construct(private readonly AdminOverviewService $adminOverviewService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->adminOverviewService->getOverview());
    }
}
