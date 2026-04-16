<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListRsvpsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(['all', 'attending', 'declined', 'pending'])],
            'search' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}

