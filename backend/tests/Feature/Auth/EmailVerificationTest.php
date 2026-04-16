<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\VerifyEmailWithFrontendLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('verified.api')->get('/api/v1/test-protected', function () {
            return response()->json(['ok' => true]);
        });
    }

    public function test_verify_endpoint_marks_user_as_verified(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'verifyme@example.com',
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $parts = parse_url($url);
        $path = $parts['path'] ?? '';
        $query = $parts['query'] ?? '';

        $response = $this->postJson($path . '?' . $query);

        $response->assertOk()->assertJson([
            'message' => 'Email verified successfully.',
        ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verify_endpoint_returns_403_for_invalid_hash(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'invalid-hash@example.com',
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1('wrong-email@example.com'),
        ]);

        $parts = parse_url($url);
        $path = $parts['path'] ?? '';
        $query = $parts['query'] ?? '';

        $this->postJson($path . '?' . $query)
            ->assertForbidden();
    }

    public function test_verify_endpoint_returns_403_if_already_verified(): void
    {
        $user = User::factory()->create([
            'email' => 'already@example.com',
            'email_verified_at' => now(),
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $parts = parse_url($url);
        $path = $parts['path'] ?? '';
        $query = $parts['query'] ?? '';

        $this->postJson($path . '?' . $query)
            ->assertForbidden()
            ->assertJson([
                'message' => 'Email address is already verified.',
            ]);
    }

    public function test_resend_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/email/resend')
            ->assertUnauthorized();
    }

    public function test_resend_sends_notification_for_unverified_user(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/resend')
            ->assertOk()
            ->assertJson([
                'message' => 'Verification email resent successfully.',
            ]);

        Notification::assertSentTo($user, VerifyEmailWithFrontendLink::class);
    }

    public function test_resend_returns_ok_when_already_verified(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/resend')
            ->assertOk()
            ->assertJson([
                'message' => 'Email address is already verified.',
            ]);
    }

    public function test_verified_middleware_blocks_unverified_users_on_api_v1_routes(): void
    {
        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/test-protected')
            ->assertForbidden()
            ->assertJson([
                'message' => 'Your email address is not verified.',
            ]);
    }

    public function test_verified_middleware_allows_verified_users_on_api_v1_routes(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/test-protected')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
