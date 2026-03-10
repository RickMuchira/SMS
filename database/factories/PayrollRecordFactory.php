<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PayrollRecord>
 */
class PayrollRecordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $grossSalary = fake()->randomFloat(2, 30000, 200000);
        $totalAllowances = fake()->randomFloat(2, 5000, 20000);

        return [
            'year' => now()->year,
            'month' => now()->month,
            'gross_salary' => $grossSalary,
            'allowances' => [],
            'total_allowances' => $totalAllowances,
            'nssf_employee' => 0,
            'nssf_employer' => 0,
            'shif' => 0,
            'ahl_employee' => 0,
            'ahl_employer' => 0,
            'paye' => 0,
            'custom_deductions' => [],
            'total_custom_deductions' => 0,
            'total_deductions' => 0,
            'net_salary' => $grossSalary,
            'status' => 'draft',
            'payment_date' => null,
            'approved_by' => null,
            'approved_at' => null,
            'notes' => null,
        ];
    }
}
