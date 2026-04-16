<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;

class ExportRsvpsRequest extends FormRequest
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
            'only_attending' => ['nullable', 'in:true,false,1,0'],
        ];
    }
}
