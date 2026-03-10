<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStaffProfileRequest extends FormRequest
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
        $id = $this->route('id');
        $staffProfile = $id ? \App\Models\StaffProfile::find($id) : null;
        $staffProfileId = $staffProfile?->id;
        $userId = $staffProfile?->user_id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', "unique:users,email,{$userId}"],
            'password' => ['sometimes', 'string', 'min:8'],

            'national_id_number' => ['nullable', 'string', "unique:staff_profiles,national_id_number,{$staffProfileId}"],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'in:male,female,other'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'personal_email' => ['nullable', 'email', 'max:255'],
            'home_address' => ['nullable', 'string', 'max:500'],
            'next_of_kin_name' => ['nullable', 'string', 'max:255'],
            'next_of_kin_relationship' => ['nullable', 'string', 'max:100'],
            'next_of_kin_phone' => ['nullable', 'string', 'max:20'],
            'profile_photo' => ['nullable', 'string', 'max:500'],

            'job_title' => ['nullable', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:staff_departments,id'],
            'employment_type' => ['sometimes', 'in:full-time,part-time,contract'],
            'date_of_joining' => ['nullable', 'date'],
            'employment_status' => ['sometimes', 'in:active,suspended,terminated'],

            'tsc_number' => ['nullable', 'string', 'max:20'],
            'kra_pin' => ['nullable', 'string', 'max:20'],
            'nssf_number' => ['nullable', 'string', 'max:20'],
            'sha_shif_number' => ['nullable', 'string', 'max:20'],

            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],
            'bank_branch' => ['nullable', 'string', 'max:100'],

            'gross_monthly_salary' => ['sometimes', 'numeric', 'min:0'],
            'allowances' => ['nullable', 'array'],
            'allowances.*.name' => ['required', 'string', 'max:100'],
            'allowances.*.amount' => ['required', 'numeric', 'min:0'],
            'custom_deductions' => ['nullable', 'array'],
            'custom_deductions.*.name' => ['required', 'string', 'max:100'],
            'custom_deductions.*.amount' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered',
            'password.min' => 'Password must be at least 8 characters',
            'national_id_number.unique' => 'This National ID is already registered',
            'date_of_birth.before' => 'Date of birth must be in the past',
            'employment_type.in' => 'Employment type must be full-time, part-time, or contract',
            'employment_status.in' => 'Employment status must be active, suspended, or terminated',
            'gross_monthly_salary.min' => 'Salary must be a positive number',
        ];
    }
}
