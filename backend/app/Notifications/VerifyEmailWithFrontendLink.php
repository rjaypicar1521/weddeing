<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailWithFrontendLink extends VerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $backendUrl = $this->verificationUrl($notifiable);

        $parts = parse_url($backendUrl);
        $path = $parts['path'] ?? '';
        $query = [];

        parse_str($parts['query'] ?? '', $query);

        preg_match('#/email/verify/([^/]+)/([^/?]+)$#', $path, $matches);

        $id = $matches[1] ?? '';
        $hash = $matches[2] ?? '';

        $frontendBase = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $frontendUrl = $frontendBase . '/auth/verify-email?' . http_build_query([
            'id' => $id,
            'hash' => $hash,
            'expires' => $query['expires'] ?? null,
            'signature' => $query['signature'] ?? null,
        ]);

        return (new MailMessage)
            ->subject('Verify Your Email Address')
            ->line('Thanks for registering with Wedding-Online. Please verify your email address to continue.')
            ->action('Verify Email Address', $frontendUrl)
            ->line('If you did not create this account, no further action is required.');
    }
}
