<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReminderController extends Controller
{
    public function __construct(
        private readonly AdminReminderService $adminReminderService,
    ) {
    }

    public function sendPending(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $result = $this->adminReminderService->sendPending($admin);

        return response()->json([
            'queued' => $result['queued'],
            'skipped' => $result['skipped'],
            'total_pending' => $result['total_pending'],
            'message' => "Reminders queued for {$result['queued']} guest(s).",
        ]);
    }

    public function sendSingle(Request $request, int $guestId): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $result = $this->adminReminderService->sendSingle($admin, $guestId);

        return response()->json([
            'queued' => $result['queued'],
            'skipped' => $result['skipped'],
            'guest_name' => $result['guest_name'],
            'message' => $result['queued']
                ? "Reminder queued for {$result['guest_name']}."
                : "Skipped {$result['guest_name']} (no valid email).",
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json($this->adminReminderService->stats());
    }
}
