<?php

namespace App\Http\Controllers\Couple;

use App\Http\Controllers\Controller;
use App\Models\InvitationTemplate;
use Illuminate\Http\JsonResponse;

class TemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = InvitationTemplate::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get([
                'id',
                'name',
                'slug',
                'preview_image_path',
                'plan_required',
                'region',
                'is_active',
            ]);

        return response()->json([
            'templates' => $templates,
        ]);
    }
}

