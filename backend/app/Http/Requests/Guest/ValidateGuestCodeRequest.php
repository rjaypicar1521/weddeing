<?php

namespace App\Http\Requests\Guest;

use Illuminate\Foundation\Http\FormRequest;

class ValidateGuestCodeRequest extends FormRequest
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
            'code' => ['required', 'string', 'size:6', 'regex:/^[A-Z0-9]{6}$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $rawCode = (string) $this->input('code', '');
        $normalizedCode = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $rawCode));

        $this->merge([
            'code' => $normalizedCode,
        ]);
    }
}

