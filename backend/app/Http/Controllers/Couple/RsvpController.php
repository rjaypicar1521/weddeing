<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\ExportRsvpsRequest;
use App\Http\Requests\Couple\ListRsvpsRequest;
use App\Http\Requests\Couple\StoreRsvpNoteRequest;
use App\Http\Requests\Couple\UpdateRsvpRequest;
use App\Models\User;
use App\Services\CoupleRsvpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RsvpController extends Controller
{
    public function __construct(private readonly CoupleRsvpService $coupleRsvpService)
    {
    }

    public function index(ListRsvpsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $rsvps = $this->coupleRsvpService->listForUser($user, $request->validated());

        return response()->json([
            'rsvps' => $rsvps->items(),
            'meta' => [
                'current_page' => $rsvps->currentPage(),
                'last_page' => $rsvps->lastPage(),
                'per_page' => $rsvps->perPage(),
                'total' => $rsvps->total(),
                'has_more' => $rsvps->hasMorePages(),
            ],
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $stats = $this->coupleRsvpService->statsForUser($user);

        return response()->json($stats);
    }

    public function export(ExportRsvpsRequest $request): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();

        $onlyAttending = $request->boolean('only_attending');
        $rows = $this->coupleRsvpService->exportRowsForUser($user, $onlyAttending);

        $filename = 'wedding-online-guestlist-' . now()->toDateString() . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'wb');
            if (! $handle) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Guest Name',
                'Attending',
                '+1 Name',
                'Meal Preference',
                'Transport',
                'Favorite Memory',
                'Message',
                'Date Submitted',
            ]);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function update(UpdateRsvpRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $result = $this->coupleRsvpService->updateForUser($user, $id, $request->validated());

        return response()->json([
            'rsvp' => $result['rsvp'],
            'notification_sent' => $result['notification_sent'],
            'message' => 'RSVP updated successfully.',
        ]);
    }

    public function storeNote(StoreRsvpNoteRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notes = $this->coupleRsvpService->addNoteForUser($user, $id, (string) $request->validated('note'));

        return response()->json([
            'notes' => $notes,
            'message' => 'Private note saved.',
        ]);
    }
}
