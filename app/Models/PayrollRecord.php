<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_profile_id',
        'year',
        'month',
        'gross_salary',
        'allowances',
        'total_allowances',
        'nssf_employee',
        'nssf_employer',
        'shif',
        'ahl_employee',
        'ahl_employer',
        'paye',
        'custom_deductions',
        'total_custom_deductions',
        'total_deductions',
        'net_salary',
        'status',
        'payment_date',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'gross_salary' => 'decimal:2',
            'total_allowances' => 'decimal:2',
            'nssf_employee' => 'decimal:2',
            'nssf_employer' => 'decimal:2',
            'shif' => 'decimal:2',
            'ahl_employee' => 'decimal:2',
            'ahl_employer' => 'decimal:2',
            'paye' => 'decimal:2',
            'total_custom_deductions' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'allowances' => 'array',
            'custom_deductions' => 'array',
            'payment_date' => 'date',
            'approved_at' => 'datetime',
        ];
    }

    public function staffProfile(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getPeriodAttribute(): string
    {
        return date('F Y', mktime(0, 0, 0, $this->month, 1, $this->year));
    }

    public function getTotalEmployerContributionsAttribute(): float
    {
        return (float) ($this->nssf_employer + $this->ahl_employer);
    }
}
