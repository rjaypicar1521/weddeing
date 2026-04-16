<?php

namespace App\Http\Requests\Guest;

use Illuminate\Foundation\Http\FormRequest;

class StoreGuestWishRequest extends FormRequest
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
            'guest_name' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:500'],
        ];
    }
}

