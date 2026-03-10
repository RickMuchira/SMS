<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StaffProfile extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_id',
        'national_id_number',
        'date_of_birth',
        'gender',
        'phone_number',
        'personal_email',
        'home_address',
        'next_of_kin_name',
        'next_of_kin_relationship',
        'next_of_kin_phone',
        'profile_photo',
        'job_title',
        'department_id',
        'employment_type',
        'date_of_joining',
        'employment_status',
        'tsc_number',
        'kra_pin',
        'nssf_number',
        'sha_shif_number',
        'bank_name',
        'bank_account_number',
        'bank_branch',
        'gross_monthly_salary',
        'allowances',
        'custom_deductions',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'date_of_joining' => 'date',
            'gross_monthly_salary' => 'decimal:2',
            'allowances' => 'array',
            'custom_deductions' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(StaffDepartment::class, 'department_id');
    }

    public function payrollRecords(): HasMany
    {
        return $this->hasMany(PayrollRecord::class);
    }

    public function getTotalAllowancesAttribute(): float
    {
        if (! $this->allowances) {
            return 0.0;
        }

        return (float) collect($this->allowances)->sum('amount');
    }

    public function getTotalCustomDeductionsAttribute(): float
    {
        if (! $this->custom_deductions) {
            return 0.0;
        }

        return (float) collect($this->custom_deductions)->sum('amount');
    }
}
