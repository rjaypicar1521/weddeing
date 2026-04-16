<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class RegisterController extends Controller
{
    public function store(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $message = 'Registration successful. Please verify your email address.';

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => $validated['password'],
            'plan' => 'free',
            'storage_used_bytes' => 0,
            'storage_limit_bytes' => 52428800,
            'is_admin' => false,
            'email_verified_at' => null,
        ]);

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            Log::warning('Failed to send verification email after registration.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $exception->getMessage(),
            ]);

            $message = 'Registration successful, but we could not send a verification email right now. Please try "Resend verification email" in a moment.';
        }

        return response()->json([
            'message' => $message,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'plan' => $user->plan,
                'storage_used_bytes' => $user->storage_used_bytes,
                'storage_limit_bytes' => $user->storage_limit_bytes,
                'is_admin' => $user->is_admin,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ], 201);
    }
}
