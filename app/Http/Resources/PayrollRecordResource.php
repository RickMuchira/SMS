<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayrollRecordResource extends JsonResource
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
            'staff_profile_id' => $this->staff_profile_id,
            'staff_profile' => new StaffProfileResource($this->whenLoaded('staffProfile')),

            'year' => $this->year,
            'month' => $this->month,
            'period' => $this->period,

            'gross_salary' => (float) $this->gross_salary,
            'allowances' => $this->allowances,
            'total_allowances' => (float) $this->total_allowances,

            'deductions' => [
                'nssf' => [
                    'employee' => (float) $this->nssf_employee,
                    'employer' => (float) $this->nssf_employer,
                ],
                'shif' => (float) $this->shif,
                'ahl' => [
                    'employee' => (float) $this->ahl_employee,
                    'employer' => (float) $this->ahl_employer,
                ],
                'paye' => (float) $this->paye,
            ],

            'nssf_employee' => (float) $this->nssf_employee,
            'nssf_employer' => (float) $this->nssf_employer,
            'shif' => (float) $this->shif,
            'ahl_employee' => (float) $this->ahl_employee,
            'ahl_employer' => (float) $this->ahl_employer,
            'paye' => (float) $this->paye,

            'custom_deductions' => $this->custom_deductions,
            'total_custom_deductions' => (float) $this->total_custom_deductions,

            'total_deductions' => (float) $this->total_deductions,
            'net_salary' => (float) $this->net_salary,
            'total_employer_contributions' => $this->total_employer_contributions,

            'status' => $this->status,
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toISOString(),
            'notes' => $this->notes,

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
