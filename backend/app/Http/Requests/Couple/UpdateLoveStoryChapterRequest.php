<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLoveStoryChapterRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'story_text' => ['sometimes', 'required', 'string', 'max:5000'],
            'photo_path' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'chapter_date' => ['sometimes', 'nullable', 'date'],
            'sort_order' => ['sometimes', 'required', 'integer', 'min:0'],
        ];
    }
}
