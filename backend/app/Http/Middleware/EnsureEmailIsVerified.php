<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * @var array<int, string>
     */
    private array $except = [
        'api/v1/auth/login',
        'api/v1/auth/logout',
        'api/v1/auth/register',
        'api/v1/auth/email/verify/*',
        'api/v1/auth/email/resend',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->isExcepted($request)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && ! $user->hasVerifiedEmail()) {
            return new JsonResponse([
                'message' => 'Your email address is not verified.',
            ], 403);
        }

        return $next($request);
    }

    private function isExcepted(Request $request): bool
    {
        foreach ($this->except as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        return false;
    }
}
