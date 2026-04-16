<?php

namespace App\Http\Requests\Couple;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UploadMediaRequest extends FormRequest
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
            'file' => ['required', 'file'],
            'type' => ['required', Rule::in(['hero', 'gallery', 'entourage', 'chapter', 'qr_code'])],
            'invitation_id' => [
                'nullable',
                'integer',
                Rule::exists('invitations', 'id')->where('user_id', $this->user()?->id),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $file = $this->file('file');
            $type = $this->input('type');

            if (! $file || ! is_string($type)) {
                return;
            }

            $mime = strtolower((string) $file->getClientOriginalExtension());
            $sizeInBytes = (int) $file->getSize();

            if ($type === 'qr_code') {
                if (! in_array($mime, ['jpg', 'jpeg', 'png'], true)) {
                    $validator->errors()->add('file', 'QR code file must be JPG, JPEG, or PNG.');
                }

                if ($sizeInBytes > 2 * 1024 * 1024) {
                    $validator->errors()->add('file', 'QR code file size must not exceed 2MB.');
                }

                return;
            }

            if (! in_array($mime, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $validator->errors()->add('file', 'Photo file must be JPG, JPEG, PNG, or WEBP.');
            }

            if ($sizeInBytes > 10 * 1024 * 1024) {
                $validator->errors()->add('file', 'Photo file size must not exceed 10MB.');
            }
        });
    }
}

