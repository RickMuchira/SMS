<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePayrollRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'staff_profile_ids' => ['nullable', 'array'],
            'staff_profile_ids.*' => ['exists:staff_profiles,id'],
            'department_id' => ['nullable', 'exists:staff_departments,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'year.required' => 'Year is required',
            'year.min' => 'Year must be 2020 or later',
            'month.required' => 'Month is required',
            'month.min' => 'Month must be between 1 and 12',
            'month.max' => 'Month must be between 1 and 12',
            'staff_profile_ids.*.exists' => 'One or more staff members do not exist',
            'department_id.exists' => 'The selected department does not exist',
        ];
    }
}
