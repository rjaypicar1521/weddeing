<?php

namespace App\Http\Middleware;

use App\Models\Invitation;
use App\Models\GuestGroup;
use App\Services\GuestTokenService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AuthenticateGuestToken
{
    public function __construct(private readonly GuestTokenService $guestTokenService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! is_string($token) || $token === '') {
            throw new HttpException(401, 'Guest token is required.');
        }

        $payload = $this->guestTokenService->validateToken($token);

        $invitation = Invitation::query()->find($payload['invitation_id']);
        if (! $invitation || $invitation->status !== 'published') {
            throw new HttpException(404, "This invitation isn't available yet. Contact the couple.");
        }

        $guestGroupId = $payload['guest_group_id'] ?? null;
        $guestGroup = null;
        if (is_int($guestGroupId)) {
            $guestGroup = GuestGroup::query()
                ->where('id', $guestGroupId)
                ->where('invitation_id', $invitation->id)
                ->where('status', 'active')
                ->first();
        }

        if (! $guestGroup) {
            $guestGroup = $invitation->defaultGuestGroup()->first();
        }

        $request->attributes->set('guest_invitation_id', (int) $invitation->id);
        $request->attributes->set('guest_group_id', $guestGroup?->id);
        $request->attributes->set('guest_token_hash', $this->guestTokenService->tokenHash($token));

        return $next($request);
    }
}
