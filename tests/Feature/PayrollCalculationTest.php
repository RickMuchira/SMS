<?php

use App\Models\StaffDepartment;
use App\Models\StaffProfile;
use App\Models\User;
use App\Services\PayrollCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(\Database\Seeders\DeductionConfigurationSeeder::class);
});

test('calculates NSSF correctly for salary below tier 1 limit', function () {
    $service = new PayrollCalculationService;
    $result = $service->calculateNSSF(5000);

    expect($result)->toBeArray()
        ->and($result['employee'])->toBe(300.0)
        ->and($result['employer'])->toBe(300.0);
});

test('calculates NSSF correctly for salary above tier 1 but below tier 2', function () {
    $service = new PayrollCalculationService;
    $result = $service->calculateNSSF(50000);

    $tierI = 8000 * 0.06;
    $tierII = (50000 - 8000) * 0.06;
    $expected = $tierI + $tierII;

    expect($result)->toBeArray()
        ->and($result['employee'])->toBe($expected)
        ->and($result['employer'])->toBe($expected);
});

test('calculates NSSF correctly for salary above tier 2 limit', function () {
    $service = new PayrollCalculationService;
    $result = $service->calculateNSSF(100000);

    $tierI = 8000 * 0.06;
    $tierII = (72000 - 8000) * 0.06;
    $expected = $tierI + $tierII;

    expect($result)->toBeArray()
        ->and($result['employee'])->toBe($expected)
        ->and($result['employer'])->toBe($expected)
        ->and($result['employee'])->toBe(4320.0);
});

test('calculates SHIF correctly', function () {
    $service = new PayrollCalculationService;

    $result1 = $service->calculateSHIF(50000);
    expect($result1)->toBe(1375.0);

    $result2 = $service->calculateSHIF(10000);
    expect($result2)->toBe(300.0);
});

test('calculates AHL correctly', function () {
    $service = new PayrollCalculationService;
    $result = $service->calculateAHL(50000);

    expect($result)->toBeArray()
        ->and($result['employee'])->toBe(750.0)
        ->and($result['employer'])->toBe(750.0);
});

test('calculates PAYE correctly for first tax band', function () {
    $service = new PayrollCalculationService;
    $grossSalary = 24000;
    $nssf = 1440;
    $ahl = 360;

    $result = $service->calculatePAYE($grossSalary, $nssf, $ahl);

    $taxableIncome = $grossSalary - $nssf - $ahl;
    $tax = $taxableIncome * 0.10;
    $expected = max($tax - 2400, 0);

    expect($result)->toBe(round($expected, 2));
});

test('calculates PAYE correctly for higher salary', function () {
    $service = new PayrollCalculationService;
    $grossSalary = 100000;
    $nssf = 4320;
    $ahl = 1500;

    $result = $service->calculatePAYE($grossSalary, $nssf, $ahl);

    expect($result)->toBeGreaterThan(0);
});

test('calculates full payroll correctly', function () {
    $department = StaffDepartment::factory()->create();
    $user = User::factory()->create();
    $staffProfile = StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'gross_monthly_salary' => 50000,
        'allowances' => [
            ['name' => 'Transport', 'amount' => 5000],
            ['name' => 'Housing', 'amount' => 10000],
        ],
        'custom_deductions' => [
            ['name' => 'Loan Repayment', 'amount' => 2000],
        ],
    ]);

    $service = new PayrollCalculationService;
    $result = $service->calculatePayroll($staffProfile, 2025, 3);

    expect($result)->toBeArray()
        ->and($result['gross_salary'])->toBe(50000.0)
        ->and($result['total_allowances'])->toBe(15000.0)
        ->and($result['nssf_employee'])->toBeGreaterThan(0)
        ->and($result['shif'])->toBeGreaterThan(0)
        ->and($result['ahl_employee'])->toBeGreaterThan(0)
        ->and($result['paye'])->toBeGreaterThan(0)
        ->and($result['total_custom_deductions'])->toBe(2000.0)
        ->and($result['net_salary'])->toBeLessThan(50000.0 + 15000.0);
});

test('net salary calculation is correct', function () {
    $department = StaffDepartment::factory()->create();
    $user = User::factory()->create();
    $staffProfile = StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'gross_monthly_salary' => 30000,
        'allowances' => [],
        'custom_deductions' => [],
    ]);

    $service = new PayrollCalculationService;
    $result = $service->calculatePayroll($staffProfile, 2025, 3);

    $calculatedNet = $result['gross_salary']
        + $result['total_allowances']
        - $result['nssf_employee']
        - $result['shif']
        - $result['ahl_employee']
        - $result['paye']
        - $result['total_custom_deductions'];

    expect($result['net_salary'])->toBe(round($calculatedNet, 2));
});
