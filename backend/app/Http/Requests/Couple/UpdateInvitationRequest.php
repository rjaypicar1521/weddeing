<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'partner1_name' => ['required_without:gift_methods', 'string', 'max:255'],
            'partner2_name' => ['required_without:gift_methods', 'string', 'max:255'],
            'wedding_date' => ['required_without:gift_methods', 'date', 'after:today'],
            'wedding_time' => ['nullable', 'date_format:H:i'],
            'venue_name' => ['required_without:gift_methods', 'string', 'max:255'],
            'venue_address' => ['nullable', 'string', 'max:255'],
            'dress_code' => ['nullable', 'string', 'max:255'],
            'dress_code_colors' => ['nullable', 'array', 'max:5'],
            'dress_code_colors.*' => ['string', 'regex:/^#(?:[0-9a-fA-F]{3}){1,2}$/'],
            'schedule' => ['nullable', 'array', 'max:20'],
            'schedule.*.time' => ['required', 'date_format:H:i'],
            'schedule.*.event' => ['required', 'string', 'max:255'],
            'schedule.*.description' => ['nullable', 'string', 'max:1000'],
            'template_id' => [
                'nullable',
                'integer',
                Rule::exists('invitation_templates', 'id')->where('is_active', true),
            ],
            'color_palette' => ['nullable', 'array'],
            'color_palette.accent' => ['nullable', 'string', 'regex:/^#(?:[0-9a-fA-F]{3}){1,2}$/'],
            'prenup_video_url' => ['nullable', 'url', 'regex:/^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be)\\//i'],
            'music_url' => ['nullable', 'url', 'regex:/^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be)\\//i'],
            'gift_methods' => ['nullable', 'array', 'max:3'],
            'gift_methods.*.label' => ['required', 'string', 'max:255'],
            'gift_methods.*.qr_path' => ['required', 'string', 'max:2048'],
            'gift_methods.*.account_name' => ['required', 'string', 'max:255'],
            'gift_methods.*.account_number' => ['required', 'string', 'max:255'],
        ];
    }
}

