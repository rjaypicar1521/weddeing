<?php

namespace App\Http\Requests\Guest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuestRsvpRequest extends FormRequest
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
            'guest_id' => ['nullable', 'integer', 'min:1'],
            'guest_name' => ['nullable', 'string', 'max:120'],
            'attending' => ['required', 'boolean'],
            'plus_one_name' => ['nullable', 'string', 'max:120'],
            'meal_preference' => ['nullable', Rule::in(['Beef', 'Fish', 'Vegetarian', 'Kids'])],
            'transport' => ['nullable', Rule::in(['has_car', 'needs_shuttle', 'own_arrangement'])],
            'favorite_memory' => ['nullable', 'string', 'max:300'],
            'message_to_couple' => ['nullable', 'string', 'max:500'],
        ];
    }
}
