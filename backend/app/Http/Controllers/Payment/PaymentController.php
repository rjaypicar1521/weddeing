<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\VerifyDomainRequest;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
    ) {
    }

    public function createCheckout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->createCheckoutSession($user);

        return response()->json($payload);
    }

    public function status(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->getStatus($user);

        return response()->json($payload);
    }

    public function usage(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(
            $this->paymentService->getUsage($user),
        );
    }

    public function usageAnalytics(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(
            $this->paymentService->getUsageAnalytics($user),
        );
    }

    public function portal(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->createPortalSession($user);

        return response()->json($payload);
    }

    public function portalSession(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->createPortalSession($user);

        return response()->json($payload);
    }

    public function invoiceHistory(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->getInvoiceHistory($user);

        return response()->json($payload);
    }

    public function verifyDomain(VerifyDomainRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->verifyDomain($user, (string) $request->validated('domain'));

        return response()->json($payload);
    }

    public function domainStatus(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $payload = $this->paymentService->getDomainStatus($user);

        return response()->json($payload);
    }

    public function webhook(Request $request): JsonResponse
    {
        try {
            $this->paymentService->handleWebhook(
                (string) $request->getContent(),
                $request->header('Stripe-Signature'),
            );
        } catch (HttpException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
        }

        return response()->json([
            'received' => true,
        ]);
    }
}
