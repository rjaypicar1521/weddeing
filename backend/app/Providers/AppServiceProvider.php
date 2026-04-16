<?php

namespace App\Providers;

use App\Events\GuestRsvpSubmitted;
use App\Events\GuestRsvpUpdated;
use App\Listeners\SendRsvpNotificationToCouple;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(GuestRsvpSubmitted::class, [SendRsvpNotificationToCouple::class, 'handleSubmitted']);
        Event::listen(GuestRsvpUpdated::class, [SendRsvpNotificationToCouple::class, 'handleUpdated']);

        RateLimiter::for('guest-code-validate', function (Request $request) {
            return Limit::perHour(10)->by((string) $request->ip());
        });

        RateLimiter::for('guest-code-regenerate', function (Request $request) {
            return Limit::perDay(3)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('guest-rsvp-submit', function (Request $request) {
            $token = (string) $request->bearerToken();
            $key = $token !== '' ? hash('sha256', $token) : (string) $request->ip();

            return Limit::perDay(3)->by($key);
        });

        RateLimiter::for('guest-wish-submit', function (Request $request) {
            $token = (string) $request->bearerToken();
            $key = $token !== '' ? hash('sha256', $token) : (string) $request->ip();

            return Limit::perHour(5)->by($key);
        });

        RateLimiter::for('guest-wish-flag', function (Request $request) {
            $token = (string) $request->bearerToken();
            $key = $token !== '' ? hash('sha256', $token) : (string) $request->ip();

            return Limit::perDay(10)->by($key);
        });

        RateLimiter::for('rsvp-export', function (Request $request) {
            return Limit::perMinutes(5, 1)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('admin-reminder-bulk', function (Request $request) {
            return Limit::perHour(1)->by((string) ($request->user()?->id ?? $request->ip()));
        });
    }
}
