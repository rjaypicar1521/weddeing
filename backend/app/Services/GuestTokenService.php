<?php

namespace App\Services;

use App\Models\GuestGroup;
use App\Models\Invitation;
use Illuminate\Support\Arr;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GuestTokenService
{
    public function issueToken(Invitation $invitation, ?GuestGroup $guestGroup = null): string
    {
        $issuedAt = now();
        $expiresAt = $issuedAt->copy()->addHours(24);

        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256',
        ];

        $payload = [
            'iss' => config('app.url'),
            'iat' => $issuedAt->timestamp,
            'exp' => $expiresAt->timestamp,
            'invitation_id' => $invitation->id,
            'invitation_slug' => $invitation->slug,
            'guest_group_id' => $guestGroup?->id,
            'guest_group_name' => $guestGroup?->name,
        ];

        $encodedHeader = $this->base64UrlEncode((string) json_encode($header));
        $encodedPayload = $this->base64UrlEncode((string) json_encode($payload));
        $signatureInput = $encodedHeader . '.' . $encodedPayload;

        $signature = hash_hmac('sha256', $signatureInput, $this->resolveSigningKey(), true);
        $encodedSignature = $this->base64UrlEncode($signature);

        return $signatureInput . '.' . $encodedSignature;
    }

    private function resolveSigningKey(): string
    {
        $appKey = (string) config('app.key');
        if ($appKey === '') {
            throw new RuntimeException('Application key is missing.');
        }

        if (str_starts_with($appKey, 'base64:')) {
            $decoded = base64_decode(substr($appKey, 7), true);
            if ($decoded === false) {
                throw new RuntimeException('Application key is invalid.');
            }

            return $decoded;
        }

        return $appKey;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /**
     * @return array{iss?: string|null, iat?: int|null, exp?: int, invitation_id?: int, invitation_slug?: string|null, guest_group_id?: int|null, guest_group_name?: string|null}
     */
    public function validateToken(string $token): array
    {
        $segments = explode('.', $token);
        if (count($segments) !== 3) {
            throw new HttpException(401, 'Invalid guest token.');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $segments;

        $decodedHeader = $this->base64UrlDecode($encodedHeader);
        $decodedPayload = $this->base64UrlDecode($encodedPayload);
        $decodedSignature = $this->base64UrlDecode($encodedSignature);

        if ($decodedHeader === null || $decodedPayload === null || $decodedSignature === null) {
            throw new HttpException(401, 'Invalid guest token.');
        }

        /** @var array<string, mixed> $header */
        $header = json_decode($decodedHeader, true) ?? [];
        /** @var array<string, mixed> $payload */
        $payload = json_decode($decodedPayload, true) ?? [];

        if (($header['alg'] ?? null) !== 'HS256') {
            throw new HttpException(401, 'Invalid guest token.');
        }

        $signatureInput = $encodedHeader . '.' . $encodedPayload;
        $expectedSignature = hash_hmac('sha256', $signatureInput, $this->resolveSigningKey(), true);

        if (! hash_equals($expectedSignature, $decodedSignature)) {
            throw new HttpException(401, 'Invalid guest token.');
        }

        $expiresAt = Arr::get($payload, 'exp');
        $invitationId = Arr::get($payload, 'invitation_id');

        if (! is_int($expiresAt) || ! is_int($invitationId)) {
            throw new HttpException(401, 'Invalid guest token.');
        }

        if ($expiresAt < now()->timestamp) {
            throw new HttpException(401, 'Guest token has expired.');
        }

        return [
            'iss' => is_string(Arr::get($payload, 'iss')) ? Arr::get($payload, 'iss') : null,
            'iat' => is_int(Arr::get($payload, 'iat')) ? Arr::get($payload, 'iat') : null,
            'exp' => $expiresAt,
            'invitation_id' => $invitationId,
            'invitation_slug' => is_string(Arr::get($payload, 'invitation_slug')) ? Arr::get($payload, 'invitation_slug') : null,
            'guest_group_id' => is_int(Arr::get($payload, 'guest_group_id')) ? Arr::get($payload, 'guest_group_id') : null,
            'guest_group_name' => is_string(Arr::get($payload, 'guest_group_name')) ? Arr::get($payload, 'guest_group_name') : null,
        ];
    }

    public function tokenHash(string $token): string
    {
        return hash('sha256', $token);
    }

    private function base64UrlDecode(string $value): ?string
    {
        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            return null;
        }

        return $decoded;
    }
}
