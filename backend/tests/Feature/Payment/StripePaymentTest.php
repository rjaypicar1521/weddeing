<?php

namespace Tests\Feature\Payment;

use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class StripePaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_payment_status(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'billing-status',
            'guest_code' => 'PAY001',
            'status' => 'draft',
        ]);

        for ($index = 1; $index <= 5; $index++) {
            Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => "Guest {$index}",
                'attending' => false,
                'confirmation_code' => sprintf('PAY%03d', $index),
            ]);
        }

        $response = $this->getJson('/api/v1/payments/status');

        $response->assertOk()
            ->assertJsonPath('plan', 'free')
            ->assertJsonPath('guest_usage.used', 5)
            ->assertJsonPath('guest_usage.limit', 25)
            ->assertJsonPath('should_prompt_upgrade', false);
    }

    public function test_authenticated_user_can_view_guest_usage(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'guest-usage',
            'guest_code' => 'PAY006',
            'guest_limit' => 25,
            'status' => 'draft',
        ]);

        for ($index = 1; $index <= 3; $index++) {
            Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => "Guest {$index}",
                'attending' => false,
                'confirmation_code' => sprintf('USG%03d', $index),
            ]);
        }

        $response = $this->getJson('/api/v1/payments/usage');

        $response->assertOk()
            ->assertJson([
                'guests_used' => 3,
                'guest_limit' => 25,
                'upgrade_needed' => false,
            ]);
    }

    public function test_authenticated_user_can_view_usage_analytics(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 30, 12, 0, 0, 'UTC'));
        try {
            $user = User::factory()->create([
                'email_verified_at' => now(),
                'plan' => 'premium',
            ]);
            Sanctum::actingAs($user);

            $invitation = Invitation::create([
                'user_id' => $user->id,
                'slug' => 'usage-analytics',
                'guest_code' => 'PAY007',
                'guest_limit' => 250,
                'wedding_date' => '2026-07-10',
                'status' => 'draft',
            ]);

            $marchOne = Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => 'March Guest 1',
                'attending' => true,
                'confirmation_code' => 'ANL001',
            ]);
            $marchOne->forceFill([
                'created_at' => Carbon::create(2026, 3, 10, 9, 0, 0, 'UTC'),
                'updated_at' => Carbon::create(2026, 3, 10, 9, 0, 0, 'UTC'),
            ])->saveQuietly();

            $marchTwo = Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => 'March Guest 2',
                'attending' => true,
                'confirmation_code' => 'ANL002',
            ]);
            $marchTwo->forceFill([
                'created_at' => Carbon::create(2026, 3, 21, 10, 0, 0, 'UTC'),
                'updated_at' => Carbon::create(2026, 3, 21, 10, 0, 0, 'UTC'),
            ])->saveQuietly();

            $februaryOne = Rsvp::create([
                'invitation_id' => $invitation->id,
                'guest_name' => 'February Guest',
                'attending' => true,
                'confirmation_code' => 'ANL003',
            ]);
            $februaryOne->forceFill([
                'created_at' => Carbon::create(2026, 2, 15, 11, 0, 0, 'UTC'),
                'updated_at' => Carbon::create(2026, 2, 15, 11, 0, 0, 'UTC'),
            ])->saveQuietly();

            $response = $this->getJson('/api/v1/payments/usage-analytics');

            $response->assertOk()
                ->assertJsonPath('current_month.guests_used', 3)
                ->assertJsonPath('current_month.guest_limit', 250)
                ->assertJsonPath('current_month.usage_pct', 1)
                ->assertJsonPath('trend.0.month', 'Mar 26')
                ->assertJsonPath('trend.0.guests', 2)
                ->assertJsonPath('trend.1.month', 'Feb 26')
                ->assertJsonPath('trend.1.guests', 1);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_usage_analytics_handles_zero_usage(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 30, 12, 0, 0, 'UTC'));
        try {
            $user = User::factory()->create([
                'email_verified_at' => now(),
                'plan' => 'free',
            ]);
            Sanctum::actingAs($user);

            Invitation::create([
                'user_id' => $user->id,
                'slug' => 'usage-zero',
                'guest_code' => 'PAY008',
                'guest_limit' => 25,
                'status' => 'draft',
            ]);

            $response = $this->getJson('/api/v1/payments/usage-analytics');

            $response->assertOk()
                ->assertJsonPath('current_month.guests_used', 0)
                ->assertJsonPath('current_month.usage_pct', 0)
                ->assertJsonPath('trend.0.guests', 0)
                ->assertJsonPath('projected_total', 0);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_usage_analytics_handles_over_limit_usage(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 30, 12, 0, 0, 'UTC'));
        try {
            $user = User::factory()->create([
                'email_verified_at' => now(),
                'plan' => 'free',
            ]);
            Sanctum::actingAs($user);

            $invitation = Invitation::create([
                'user_id' => $user->id,
                'slug' => 'usage-over-limit',
                'guest_code' => 'PAY009',
                'guest_limit' => 25,
                'status' => 'draft',
            ]);

            for ($index = 1; $index <= 30; $index++) {
                Rsvp::create([
                    'invitation_id' => $invitation->id,
                    'guest_name' => "Guest {$index}",
                    'attending' => true,
                    'confirmation_code' => sprintf('OVR%03d', $index),
                    'created_at' => Carbon::create(2026, 3, 10, 8, 0, 0, 'UTC'),
                    'updated_at' => Carbon::create(2026, 3, 10, 8, 0, 0, 'UTC'),
                ]);
            }

            $response = $this->getJson('/api/v1/payments/usage-analytics');

            $response->assertOk()
                ->assertJsonPath('current_month.guests_used', 30)
                ->assertJsonPath('current_month.guest_limit', 25)
                ->assertJsonPath('current_month.usage_pct', 120);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_authenticated_user_can_start_checkout_session(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->mock(PaymentService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('createCheckoutSession')
                ->once()
                ->andReturn([
                    'checkout_url' => 'https://checkout.stripe.test/session',
                    'session_id' => 'cs_test_123',
                ]);
        });

        $response = $this->postJson('/api/v1/payments/create-checkout');

        $response->assertOk()
            ->assertJsonPath('checkout_url', 'https://checkout.stripe.test/session')
            ->assertJsonPath('session_id', 'cs_test_123');
    }

    public function test_authenticated_user_can_open_billing_portal(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->mock(PaymentService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('createPortalSession')
                ->once()
                ->andReturn([
                    'portal_url' => 'https://billing.stripe.test/session',
                ]);
        });

        $response = $this->postJson('/api/v1/payments/portal');

        $response->assertOk()
            ->assertJsonPath('portal_url', 'https://billing.stripe.test/session');
    }

    public function test_authenticated_user_can_open_billing_portal_session_endpoint(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->mock(PaymentService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('createPortalSession')
                ->once()
                ->andReturn([
                    'portal_url' => 'https://billing.stripe.test/portal-session',
                ]);
        });

        $response = $this->postJson('/api/v1/payments/portal-session');

        $response->assertOk()
            ->assertJsonPath('portal_url', 'https://billing.stripe.test/portal-session');
    }

    public function test_authenticated_user_can_view_invoice_history(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->mock(PaymentService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('getInvoiceHistory')
                ->once()
                ->andReturn([
                    'invoices' => [
                        [
                            'invoice_id' => 'in_test_001',
                            'date' => '2026-03-30',
                            'amount' => 29,
                            'currency' => 'USD',
                            'status' => 'paid',
                            'invoice_pdf_url' => 'https://stripe.test/invoice/in_test_001.pdf',
                        ],
                    ],
                ]);
        });

        $response = $this->getJson('/api/v1/payments/invoice-history');

        $response->assertOk()
            ->assertJsonPath('invoices.0.invoice_id', 'in_test_001')
            ->assertJsonPath('invoices.0.status', 'paid')
            ->assertJsonPath('invoices.0.invoice_pdf_url', 'https://stripe.test/invoice/in_test_001.pdf');
    }

    public function test_pro_user_can_verify_custom_domain_when_dns_txt_matches(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'premium',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'domain-verify',
            'guest_code' => 'DOM001',
            'status' => 'draft',
        ]);

        config()->set('services.domain_verification.mock_txt_records', [
            "wedding-{$invitation->id}.weddingonline.com",
        ]);

        $response = $this->postJson('/api/v1/payments/verify-domain', [
            'domain' => 'yourwedding.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'verified')
            ->assertJsonPath('custom_domain', 'yourwedding.com');

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'custom_domain' => 'yourwedding.com',
            'custom_domain_status' => 'verified',
        ]);
    }

    public function test_verify_custom_domain_fails_when_dns_txt_does_not_match(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'premium',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'domain-verify-fail',
            'guest_code' => 'DOM002',
            'status' => 'draft',
        ]);

        config()->set('services.domain_verification.mock_txt_records', [
            'different-token.weddingonline.com',
        ]);

        $response = $this->postJson('/api/v1/payments/verify-domain', [
            'domain' => 'bad-domain.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', "DNS TXT verification failed. Add TXT @ -> wedding-{$invitation->id}.weddingonline.com and retry.");

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'custom_domain_status' => 'failed',
        ]);
    }

    public function test_free_user_cannot_verify_custom_domain(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'domain-verify-free',
            'guest_code' => 'DOM003',
            'status' => 'draft',
        ]);

        $response = $this->postJson('/api/v1/payments/verify-domain', [
            'domain' => 'free-domain.com',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Custom domain is available on the Pro plan only.');
    }

    public function test_authenticated_user_can_view_domain_status(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'premium',
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'domain-status',
            'guest_code' => 'DOM004',
            'status' => 'draft',
            'custom_domain' => 'yourwedding.com',
            'custom_domain_status' => 'verified',
            'custom_domain_verified_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/admin/domain-status');

        $response->assertOk()
            ->assertJsonPath('status', 'verified')
            ->assertJsonPath('custom_domain', 'yourwedding.com')
            ->assertJsonPath('expected_txt_value', "wedding-{$invitation->id}.weddingonline.com");
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        config()->set('services.stripe.webhook_secret', 'whsec_test_secret');

        $response = $this->withHeaders([
            'Stripe-Signature' => 't=1,v1=invalid-signature',
            'Content-Type' => 'application/json',
        ])->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [],
            json_encode(['id' => 'evt_test', 'type' => 'checkout.session.completed'])
        );

        $response->assertStatus(400)
            ->assertJson([
                'message' => 'Invalid Stripe signature.',
            ]);
    }

    public function test_webhook_marks_user_as_premium_and_is_idempotent(): void
    {
        config()->set('services.stripe.webhook_secret', 'whsec_test_secret');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'plan' => 'free',
            'storage_limit_bytes' => 50 * 1024 * 1024,
        ]);

        $payload = json_encode([
            'id' => 'evt_checkout_completed_1',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_checkout_1',
                    'payment_intent' => 'pi_test_payment_1',
                    'customer' => 'cus_test_customer_1',
                    'amount_total' => 2900,
                    'currency' => 'usd',
                    'payment_status' => 'paid',
                    'mode' => 'payment',
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan' => 'premium',
                    ],
                ],
            ],
        ]);

        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", 'whsec_test_secret');
        $header = "t={$timestamp},v1={$signature}";

        $request = fn () => $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'HTTP_STRIPE_SIGNATURE' => $header,
                'CONTENT_TYPE' => 'application/json',
            ],
            $payload,
        );

        $first = $request();
        $first->assertOk()->assertJsonPath('received', true);

        $second = $request();
        $second->assertOk()->assertJsonPath('received', true);

        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'stripe_event_id' => 'evt_checkout_completed_1',
            'status' => 'paid',
            'plan' => 'premium',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'plan' => 'premium',
            'storage_limit_bytes' => 500 * 1024 * 1024,
        ]);
    }
}
