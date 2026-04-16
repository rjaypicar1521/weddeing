<?php

namespace App\Http\Middleware;

use App\Models\Invitation;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomDomainRedirect
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = (string) $request->route('slug', '');
        if ($slug === '') {
            return $next($request);
        }

        /** @var Invitation|null $invitation */
        $invitation = Invitation::query()
            ->where('slug', $slug)
            ->with('user:id,plan')
            ->first();

        if (! $invitation || ! $invitation->user || $invitation->user->plan !== 'premium') {
            return $next($request);
        }

        $customDomain = trim((string) $invitation->custom_domain);
        $isVerified = (string) $invitation->custom_domain_status === 'verified';

        if ($customDomain === '' || ! $isVerified) {
            return $next($request);
        }

        if (strtolower($request->getHost()) === strtolower($customDomain)) {
            return $next($request);
        }

        $path = ltrim((string) $request->getPathInfo(), '/');
        $query = $request->getQueryString();
        $target = "https://{$customDomain}/{$path}";
        if ($query) {
            $target .= "?{$query}";
        }

        return new RedirectResponse($target, 302);
    }
}

