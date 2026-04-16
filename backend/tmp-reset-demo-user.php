<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::query()->updateOrCreate(
    ['email' => 'pro.test@example.com'],
    [
        'name' => 'Pro Test User',
        'password' => 'Password123',
        'plan' => 'premium',
        'email_verified_at' => now(),
        'storage_used_bytes' => 0,
        'storage_limit_bytes' => 5368709120,
    ]
);

echo json_encode([
    'id' => $user->id,
    'email' => $user->email,
    'plan' => $user->plan,
    'verified' => (bool) $user->email_verified_at,
], JSON_PRETTY_PRINT), PHP_EOL;
