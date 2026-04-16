<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\VerifyEmailWithFrontendLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_pending_user_and_sends_verification_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'email_verified_at',
                    'plan',
                    'storage_used_bytes',
                    'storage_limit_bytes',
                    'is_admin',
                    'created_at',
                    'updated_at',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'juan@example.com',
            'plan' => 'free',
            'is_admin' => 0,
            'storage_used_bytes' => 0,
            'storage_limit_bytes' => 52428800,
        ]);

        $user = User::where('email', 'juan@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmailWithFrontendLink::class);
    }

    public function test_registration_rejects_duplicate_email_with_field_errors(): void
    {
        User::factory()->create([
            'email' => 'taken@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Someone Else',
            'email' => 'taken@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_rejects_invalid_payload_with_field_errors(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }
}
