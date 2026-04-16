<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Http\Requests\Couple\UploadMediaRequest;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    public function __construct(private readonly MediaService $mediaService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'media' => $this->mediaService->list($user),
            'storage_used_bytes' => (int) $user->storage_used_bytes,
            'storage_limit_bytes' => (int) $user->storage_limit_bytes,
        ]);
    }

    public function upload(UploadMediaRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $file = $request->file('file');
        if (! $file) {
            return response()->json([
                'message' => 'Upload file is required.',
            ], 422);
        }

        $result = $this->mediaService->upload($user, $file, $request->validated());
        $user->refresh();

        return response()->json([
            ...$result,
            'storage_used_bytes' => (int) $user->storage_used_bytes,
            'storage_limit_bytes' => (int) $user->storage_limit_bytes,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->mediaService->delete($user, $id);

        return response()->json([], 204);
    }
}

