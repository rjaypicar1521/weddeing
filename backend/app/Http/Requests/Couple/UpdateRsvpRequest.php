<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateRsvpRequest extends FormRequest
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
            'attending' => ['sometimes', 'boolean'],
            'plus_one_name' => ['nullable', 'string', 'max:120'],
            'meal_preference' => ['nullable', 'string', 'in:Beef,Fish,Vegetarian,Kids'],
            'transport' => ['nullable', 'string', 'in:has_car,needs_shuttle,own_arrangement'],
            'favorite_memory' => ['nullable', 'string', 'max:300'],
            'message_to_couple' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $keys = [
                'attending',
                'plus_one_name',
                'meal_preference',
                'transport',
                'favorite_memory',
                'message_to_couple',
            ];

            $hasAnyField = collect($keys)->contains(fn (string $key): bool => $this->exists($key));

            if (! $hasAnyField) {
                $validator->errors()->add('payload', 'At least one editable RSVP field is required.');
            }
        });
    }
}
