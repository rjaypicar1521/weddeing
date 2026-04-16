<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CheckGuestLimit;
use App\Http\Middleware\CheckStorageQuota;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\AuthenticateGuestToken;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\CustomDomainRedirect;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'api/v1/auth/login',
            'api/v1/auth/logout',
            'api/v1/auth/user',
        ]);

        $middleware->alias([
            'verified.api' => EnsureEmailIsVerified::class,
            'check.storage.quota' => CheckStorageQuota::class,
            'check.guest.limit' => CheckGuestLimit::class,
            'auth.guest' => AuthenticateGuestToken::class,
            'admin.only' => AdminOnly::class,
            'custom.domain.redirect' => CustomDomainRedirect::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.'
                ], 401);
            }
        });
    })->create();
