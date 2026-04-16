<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use App\Models\Invitation;
use App\Models\Rsvp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use Symfony\Component\HttpKernel\Exception\HttpException;
use UnexpectedValueException;

class PaymentService
{
    public function __construct(
        private readonly GuestUsageService $guestUsageService,
    ) {
    }

    public function createCheckoutSession(User $user): array
    {
        $stripe = $this->makeStripeClient();
        $priceId = (string) config('services.stripe.price_pro_onetime');
        if ($priceId === '') {
            throw new HttpException(500, 'Stripe price is not configured.');
        }

        $customerId = $this->resolveOrCreateCustomerId($stripe, $user);
        $session = $stripe->checkout->sessions->create([
            'mode' => 'payment',
            'customer' => $customerId,
            'line_items' => [
                [
                    'price' => $priceId,
                    'quantity' => 1,
                ],
            ],
            'success_url' => $this->successUrl(),
            'cancel_url' => $this->cancelUrl(),
            'metadata' => [
                'user_id' => (string) $user->id,
                'plan' => 'premium',
            ],
        ]);

        return [
            'checkout_url' => (string) $session->url,
            'session_id' => (string) $session->id,
        ];
    }

    public function getStatus(User $user): array
    {
        $plan = (string) $user->plan;
        $usage = $this->guestUsageService->getUsage($user);
        $guestLimit = $usage['guest_limit'];
        $guestCount = $usage['guests_used'];
        $usagePercent = $guestLimit > 0 ? (int) round(($guestCount / $guestLimit) * 100) : 0;
        $latestSubscription = Subscription::query()
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->latest('paid_at')
            ->first();

        return [
            'plan' => $plan,
            'plan_label' => $plan === 'premium' ? 'Pro' : 'Free',
            'is_pro' => $plan === 'premium',
            'guest_usage' => [
                'used' => $guestCount,
                'limit' => $guestLimit,
                'percent' => min(100, max(0, $usagePercent)),
            ],
            'upgrade_needed' => $usage['upgrade_needed'],
            'should_prompt_upgrade' => $plan === 'free' && $usagePercent >= 80,
            'current_plan' => [
                'label' => $plan === 'premium' ? 'Pro' : 'Free',
                'guest_limit' => $guestLimit,
                'billed_at' => $latestSubscription?->paid_at?->toISOString(),
                'next_bill_date' => null,
            ],
        ];
    }

    /**
     * @return array{guests_used:int, guest_limit:int, upgrade_needed:bool}
     */
    public function getUsage(User $user): array
    {
        return $this->guestUsageService->getUsage($user);
    }

    /**
     * @return array{
     *   current_month: array{guests_used:int,guest_limit:int,usage_pct:int},
     *   trend: array<int, array{month:string,guests:int}>,
     *   projected:string,
     *   projected_total:int
     * }
     */
    public function getUsageAnalytics(User $user): array
    {
        $usage = $this->guestUsageService->getUsage($user);
        $guestLimit = $usage['guest_limit'];
        $guestsUsed = $usage['guests_used'];
        $usagePct = $guestLimit > 0 ? (int) round(($guestsUsed / $guestLimit) * 100) : 0;
        $invitation = $user->invitation;

        $trend = [];
        $trendCounts = [];
        $baseNow = now();
        for ($offset = 0; $offset < 6; $offset++) {
            $monthStart = $baseNow->copy()->subMonthsNoOverflow($offset)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $count = $invitation
                ? Rsvp::query()
                    ->where('invitation_id', $invitation->id)
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->count()
                : 0;

            $trend[] = [
                'month' => $monthStart->format('M y'),
                'guests' => $count,
            ];
            $trendCounts[] = $count;
        }

        $averageMonthly = count($trendCounts) > 0 ? (int) round(array_sum($trendCounts) / count($trendCounts)) : 0;
        $monthsToWedding = $this->monthsUntilWedding($invitation?->wedding_date);
        $projectedTotal = $guestsUsed + max(0, $monthsToWedding - 1) * $averageMonthly;

        return [
            'current_month' => [
                'guests_used' => $guestsUsed,
                'guest_limit' => $guestLimit,
                'usage_pct' => $usagePct,
            ],
            'trend' => $trend,
            'projected' => "On track for {$projectedTotal} guests",
            'projected_total' => $projectedTotal,
        ];
    }

    public function createPortalSession(User $user): array
    {
        $stripe = $this->makeStripeClient();
        $customerId = $this->resolveStripeCustomerIdOrFail($user);

        $session = $stripe->billingPortal->sessions->create([
            'customer' => $customerId,
            'return_url' => $this->portalReturnUrl(),
        ]);

        return [
            'portal_url' => (string) $session->url,
        ];
    }

    /**
     * @return array{invoices:array<int, array<string, mixed>>}
     */
    public function getInvoiceHistory(User $user): array
    {
        try {
            $stripe = $this->makeStripeClient();
            $customerId = $this->resolveStripeCustomerIdOrFail($user);

            $response = $stripe->invoices->all([
                'customer' => $customerId,
                'limit' => 100,
                'created' => [
                    'gte' => now()->subMonths(12)->timestamp,
                ],
            ]);
        } catch (HttpException) {
            return [
                'invoices' => [],
            ];
        }

        $invoices = [];
        foreach ($response->data as $invoice) {
            $invoiceData = method_exists($invoice, 'toArray') ? $invoice->toArray() : (array) $invoice;

            $created = isset($invoiceData['created']) ? (int) $invoiceData['created'] : null;
            $invoices[] = [
                'invoice_id' => (string) ($invoiceData['id'] ?? ''),
                'date' => $created ? now()->setTimestamp($created)->toDateString() : null,
                'amount' => isset($invoiceData['amount_paid']) ? ((int) $invoiceData['amount_paid'] / 100) : 0,
                'currency' => strtoupper((string) ($invoiceData['currency'] ?? 'USD')),
                'status' => (string) ($invoiceData['status'] ?? 'unknown'),
                'invoice_pdf_url' => (string) ($invoiceData['invoice_pdf'] ?? ''),
            ];
        }

        return [
            'invoices' => $invoices,
        ];
    }

    /**
     * @return array{status:string,next_steps:string,custom_domain:?string,expected_txt_value:string}
     */
    public function getDomainStatus(User $user): array
    {
        $invitation = $this->resolveInvitation($user);
        $expected = $this->expectedTxtValue($invitation);
        $status = (string) ($invitation->custom_domain_status ?? 'pending');
        if (! in_array($status, ['pending', 'verified', 'failed'], true)) {
            $status = 'pending';
        }

        return [
            'status' => $status,
            'custom_domain' => $invitation->custom_domain,
            'expected_txt_value' => $expected,
            'next_steps' => $this->domainNextSteps($status, $expected, $invitation->custom_domain),
        ];
    }

    /**
     * @return array{status:string,message:string,custom_domain:string,expected_txt_value:string}
     */
    public function verifyDomain(User $user, string $domain): array
    {
        if ((string) $user->plan !== 'premium') {
            throw new HttpException(403, 'Custom domain is available on the Pro plan only.');
        }

        $invitation = $this->resolveInvitation($user);
        $normalizedDomain = Str::lower(trim($domain));
        $expected = $this->expectedTxtValue($invitation);

        $records = $this->lookupTxtRecords($normalizedDomain);
        $verified = in_array($expected, $records, true);

        if (! $verified) {
            $invitation->forceFill([
                'custom_domain_status' => 'failed',
                'custom_domain_verified_at' => null,
            ])->save();

            throw new HttpException(422, "DNS TXT verification failed. Add TXT @ -> {$expected} and retry.");
        }

        $invitation->forceFill([
            'custom_domain' => $normalizedDomain,
            'custom_domain_status' => 'verified',
            'custom_domain_verified_at' => now(),
        ])->save();

        return [
            'status' => 'verified',
            'message' => 'Domain verified and connected.',
            'custom_domain' => $normalizedDomain,
            'expected_txt_value' => $expected,
        ];
    }

    public function handleWebhook(string $payload, ?string $signatureHeader): void
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret === '') {
            throw new HttpException(500, 'Stripe webhook secret is not configured.');
        }

        try {
            $event = Webhook::constructEvent($payload, (string) $signatureHeader, $secret);
        } catch (UnexpectedValueException) {
            throw new HttpException(400, 'Invalid webhook payload.');
        } catch (SignatureVerificationException) {
            throw new HttpException(400, 'Invalid Stripe signature.');
        }

        if (! in_array($event->type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)) {
            return;
        }

        $eventId = (string) $event->id;
        if ($eventId === '' || Subscription::query()->where('stripe_event_id', $eventId)->exists()) {
            return;
        }

        $session = $event->data->object;
        $sessionData = method_exists($session, 'toArray')
            ? $session->toArray()
            : (array) $session;
        $metadata = (array) ($sessionData['metadata'] ?? []);
        $userId = (int) ($metadata['user_id'] ?? 0);
        if ($userId <= 0) {
            return;
        }

        /** @var User|null $user */
        $user = User::query()->find($userId);
        if (! $user) {
            return;
        }

        DB::transaction(function () use ($eventId, $sessionData, $metadata, $user): void {
            Subscription::query()->create([
                'user_id' => $user->id,
                'stripe_event_id' => $eventId,
                'stripe_checkout_session_id' => (string) ($sessionData['id'] ?? ''),
                'stripe_payment_intent_id' => is_string($sessionData['payment_intent'] ?? null) ? (string) $sessionData['payment_intent'] : null,
                'stripe_customer_id' => is_string($sessionData['customer'] ?? null) ? (string) $sessionData['customer'] : null,
                'plan' => (string) ($metadata['plan'] ?? 'premium'),
                'amount' => (int) ($sessionData['amount_total'] ?? 0),
                'currency' => (string) ($sessionData['currency'] ?? 'usd'),
                'status' => 'paid',
                'paid_at' => now(),
                'meta' => [
                    'payment_status' => (string) ($sessionData['payment_status'] ?? ''),
                    'mode' => (string) ($sessionData['mode'] ?? ''),
                ],
            ]);

            $user->forceFill([
                'plan' => 'premium',
                'storage_limit_bytes' => 500 * 1024 * 1024,
            ])->save();

            $user->invitation?->forceFill([
                'guest_limit' => 250,
            ])->save();
        });
    }

    private function makeStripeClient(): StripeClient
    {
        $secretKey = (string) config('services.stripe.secret_key');
        if ($secretKey === '') {
            throw new HttpException(500, 'Stripe secret key is not configured.');
        }

        return new StripeClient($secretKey);
    }

    private function resolveOrCreateCustomerId(StripeClient $stripe, User $user): string
    {
        $customerId = Subscription::query()
            ->where('user_id', $user->id)
            ->whereNotNull('stripe_customer_id')
            ->latest('id')
            ->value('stripe_customer_id');

        if (is_string($customerId) && $customerId !== '') {
            return $customerId;
        }

        $customer = $stripe->customers->create([
            'name' => $user->name,
            'email' => $user->email,
            'metadata' => [
                'user_id' => (string) $user->id,
            ],
        ]);

        return (string) $customer->id;
    }

    private function resolveStripeCustomerIdOrFail(User $user): string
    {
        $customerId = Subscription::query()
            ->where('user_id', $user->id)
            ->whereNotNull('stripe_customer_id')
            ->latest('id')
            ->value('stripe_customer_id');

        if (! is_string($customerId) || $customerId === '') {
            throw new HttpException(422, 'No Stripe customer found for this account.');
        }

        return $customerId;
    }

    private function successUrl(): string
    {
        $configured = (string) config('services.stripe.success_url');
        if ($configured !== '') {
            return $configured;
        }

        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        return $frontendUrl . '/dashboard/billing?checkout=success';
    }

    private function cancelUrl(): string
    {
        $configured = (string) config('services.stripe.cancel_url');
        if ($configured !== '') {
            return $configured;
        }

        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        return $frontendUrl . '/dashboard/billing?checkout=cancelled';
    }

    private function portalReturnUrl(): string
    {
        $configured = (string) config('services.stripe.portal_return_url');
        if ($configured !== '') {
            return $configured;
        }

        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        return $frontendUrl . '/dashboard/billing';
    }

    private function resolveInvitation(User $user): Invitation
    {
        $invitation = $user->invitation;
        if (! $invitation) {
            throw new HttpException(422, 'No invitation found for this user.');
        }

        return $invitation;
    }

    private function expectedTxtValue(Invitation $invitation): string
    {
        return "wedding-{$invitation->id}.weddingonline.com";
    }

    /**
     * @return array<int, string>
     */
    private function lookupTxtRecords(string $domain): array
    {
        if (app()->environment('testing')) {
            $mockRecords = config('services.domain_verification.mock_txt_records', []);
            if (is_array($mockRecords)) {
                return array_values(array_filter(array_map(static fn ($item): string => Str::lower((string) $item), $mockRecords)));
            }
        }

        $resolved = dns_get_record($domain, DNS_TXT);
        if (! is_array($resolved)) {
            return [];
        }

        $records = [];
        foreach ($resolved as $record) {
            if (! is_array($record)) {
                continue;
            }

            $text = $record['txt'] ?? $record['txtdata'] ?? null;
            if (is_string($text) && $text !== '') {
                $records[] = Str::lower(trim($text));
            }
        }

        return array_values(array_unique($records));
    }

    private function domainNextSteps(string $status, string $expectedTxtValue, ?string $domain): string
    {
        if ($status === 'verified' && $domain) {
            return "Domain verified. {$domain} is now live.";
        }

        if ($status === 'failed') {
            return "DNS record not found. Add TXT @ -> {$expectedTxtValue}, wait 5-10 minutes, then verify again.";
        }

        return "Add TXT @ -> {$expectedTxtValue}, wait 5-10 minutes, then click Verify.";
    }

    private function monthsUntilWedding(mixed $weddingDate): int
    {
        if (! $weddingDate) {
            return 1;
        }

        $date = $weddingDate instanceof Carbon ? $weddingDate : Carbon::parse((string) $weddingDate);
        $months = now()->startOfMonth()->diffInMonths($date->startOfMonth(), false) + 1;

        return max(1, $months);
    }

}
