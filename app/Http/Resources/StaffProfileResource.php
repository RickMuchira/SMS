<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'employee_id' => $this->employee_id,

            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'roles' => $this->user->roles->pluck('name'),
            ],

            'national_id_number' => $this->national_id_number,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'gender' => $this->gender,
            'phone_number' => $this->phone_number,
            'personal_email' => $this->personal_email,
            'home_address' => $this->home_address,
            'next_of_kin_name' => $this->next_of_kin_name,
            'next_of_kin_relationship' => $this->next_of_kin_relationship,
            'next_of_kin_phone' => $this->next_of_kin_phone,
            'profile_photo' => $this->profile_photo,

            'job_title' => $this->job_title,
            'department_id' => $this->department_id,
            'department' => $this->department ? new StaffDepartmentResource($this->department) : null,
            'employment_type' => $this->employment_type,
            'date_of_joining' => $this->date_of_joining?->format('Y-m-d'),
            'employment_status' => $this->employment_status,

            'tsc_number' => $this->tsc_number,
            'kra_pin' => $this->kra_pin,
            'nssf_number' => $this->nssf_number,
            'sha_shif_number' => $this->sha_shif_number,

            'bank_name' => $this->bank_name,
            'bank_account_number' => $this->bank_account_number,
            'bank_branch' => $this->bank_branch,

            'gross_monthly_salary' => (float) $this->gross_monthly_salary,
            'allowances' => $this->allowances,
            'total_allowances' => $this->total_allowances,
            'custom_deductions' => $this->custom_deductions,
            'total_custom_deductions' => $this->total_custom_deductions,

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
