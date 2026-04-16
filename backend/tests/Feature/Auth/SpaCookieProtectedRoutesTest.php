<?php

namespace Tests\Feature\Auth;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpaCookieProtectedRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_couple_can_access_payments_usage_after_session_login(): void
    {
        $user = User::factory()->create([
            'email' => 'verified-couple@example.com',
            'password' => 'Password123',
            'email_verified_at' => now(),
            'is_admin' => false,
            'plan' => 'free',
        ]);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'verified-couple',
            'guest_code' => 'VCP001',
            'status' => 'draft',
        ]);

        $loginResponse = $this->withHeader('Origin', 'http://localhost:3000')
            ->withHeader('Referer', 'http://localhost:3000/login')
            ->postJson('/api/v1/auth/login', [
                'email' => 'verified-couple@example.com',
                'password' => 'Password123',
            ]);

        $loginResponse->assertOk()
            ->assertHeader('set-cookie');

        $this->withHeader('Origin', 'http://localhost:3000')
            ->withHeader('Referer', 'http://localhost:3000/dashboard')
            ->getJson('/api/v1/payments/usage')
            ->assertOk()
            ->assertJson([
                'guests_used' => 0,
                'guest_limit' => 25,
                'upgrade_needed' => false,
            ]);
    }
}
