<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;

class CreateTableGuestGroupsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'table_count' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
