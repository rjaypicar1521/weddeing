<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStorageQuota
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $file = $request->file('file');
        if (! $file) {
            return $next($request);
        }

        $projectedUsage = (int) $user->storage_used_bytes + (int) $file->getSize();
        $limit = (int) $user->storage_limit_bytes;

        if ($projectedUsage > $limit) {
            return new JsonResponse([
                'message' => 'Storage limit reached. Upgrade to Premium.',
            ], 422);
        }

        return $next($request);
    }
}

