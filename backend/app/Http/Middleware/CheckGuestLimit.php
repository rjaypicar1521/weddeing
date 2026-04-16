<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\GuestUsageService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckGuestLimit
{
    public function __construct(
        private readonly GuestUsageService $guestUsageService,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return $next($request);
        }

        $usage = $this->guestUsageService->getUsage($user);
        $usageHeader = "{$usage['guests_used']}/{$usage['guest_limit']}";

        if ($usage['upgrade_needed']) {
            $response = response()->json([
                'message' => 'Guest limit reached. Upgrade to add more guests.',
                'usage' => $usage,
            ], 429);

            $response->headers->set('X-Guest-Usage', $usageHeader);
            return $response;
        }

        $response = $next($request);
        if ($response instanceof JsonResponse) {
            $latestUsage = $this->guestUsageService->getUsage($user->fresh());
            $response->headers->set('X-Guest-Usage', "{$latestUsage['guests_used']}/{$latestUsage['guest_limit']}");
        } else {
            $response->headers->set('X-Guest-Usage', $usageHeader);
        }

        return $response;
    }
}

