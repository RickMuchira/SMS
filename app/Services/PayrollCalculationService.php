<?php

namespace App\Services;

use App\Models\DeductionConfiguration;
use App\Models\StaffProfile;

class PayrollCalculationService
{
    public function __construct(
        private ?DeductionConfiguration $nssfConfig = null,
        private ?DeductionConfiguration $shifConfig = null,
        private ?DeductionConfiguration $ahlConfig = null,
        private ?DeductionConfiguration $payeConfig = null,
    ) {
        $this->loadConfigurations();
    }

    private function loadConfigurations(): void
    {
        $this->nssfConfig ??= DeductionConfiguration::active()->ofType('nssf')->first();
        $this->shifConfig ??= DeductionConfiguration::active()->ofType('shif')->first();
        $this->ahlConfig ??= DeductionConfiguration::active()->ofType('ahl')->first();
        $this->payeConfig ??= DeductionConfiguration::active()->ofType('paye')->first();
    }

    public function calculatePayroll(StaffProfile $staffProfile, int $year, int $month): array
    {
        $grossSalary = (float) $staffProfile->gross_monthly_salary;
        $allowances = $staffProfile->allowances ?? [];
        $customDeductions = $staffProfile->custom_deductions ?? [];

        $totalAllowances = collect($allowances)->sum('amount');
        $totalCustomDeductions = collect($customDeductions)->sum('amount');

        $nssf = $this->calculateNSSF($grossSalary);
        $ahl = $this->calculateAHL($grossSalary);
        $shif = $this->calculateSHIF($grossSalary);
        $paye = $this->calculatePAYE($grossSalary, $nssf['employee'], $ahl['employee']);

        $totalDeductions = $nssf['employee'] + $shif + $ahl['employee'] + $paye + $totalCustomDeductions;
        $netSalary = $grossSalary + $totalAllowances - $totalDeductions;

        return [
            'gross_salary' => round($grossSalary, 2),
            'allowances' => $allowances,
            'total_allowances' => round($totalAllowances, 2),
            'nssf_employee' => round($nssf['employee'], 2),
            'nssf_employer' => round($nssf['employer'], 2),
            'shif' => round($shif, 2),
            'ahl_employee' => round($ahl['employee'], 2),
            'ahl_employer' => round($ahl['employer'], 2),
            'paye' => round($paye, 2),
            'custom_deductions' => $customDeductions,
            'total_custom_deductions' => round($totalCustomDeductions, 2),
            'total_deductions' => round($totalDeductions, 2),
            'net_salary' => round($netSalary, 2),
        ];
    }

    public function calculateNSSF(float $grossSalary): array
    {
        $params = $this->nssfConfig?->parameters ?? $this->getDefaultNSSFParams();

        $tierILimit = $params['tier_i_limit'] ?? 8000;
        $tierIILimit = $params['tier_ii_limit'] ?? 72000;
        $rate = ($params['rate'] ?? 6) / 100;

        $tierI = min($grossSalary, $tierILimit) * $rate;
        $tierII = 0;

        if ($grossSalary > $tierILimit) {
            $tierIIAmount = min($grossSalary - $tierILimit, $tierIILimit - $tierILimit);
            $tierII = $tierIIAmount * $rate;
        }

        $employee = $tierI + $tierII;
        $employer = $employee;

        return [
            'employee' => $employee,
            'employer' => $employer,
        ];
    }

    public function calculateSHIF(float $grossSalary): float
    {
        $params = $this->shifConfig?->parameters ?? $this->getDefaultSHIFParams();

        $rate = ($params['rate'] ?? 2.75) / 100;
        $minContribution = $params['min_contribution'] ?? 300;

        $calculated = $grossSalary * $rate;

        return max($calculated, $minContribution);
    }

    public function calculateAHL(float $grossSalary): array
    {
        $params = $this->ahlConfig?->parameters ?? $this->getDefaultAHLParams();

        $rate = ($params['rate'] ?? 1.5) / 100;

        $employee = $grossSalary * $rate;
        $employer = $grossSalary * $rate;

        return [
            'employee' => $employee,
            'employer' => $employer,
        ];
    }

    public function calculatePAYE(float $grossSalary, float $nssfDeduction, float $ahlDeduction): float
    {
        $taxableIncome = $grossSalary - $nssfDeduction - $ahlDeduction;

        if ($taxableIncome <= 0) {
            return 0;
        }

        $params = $this->payeConfig?->parameters ?? $this->getDefaultPAYEParams();
        $bands = $params['bands'] ?? $this->getDefaultPAYEBands();
        $personalRelief = $params['personal_relief'] ?? 2400;

        $tax = 0;
        $remainingIncome = $taxableIncome;

        foreach ($bands as $band) {
            $from = $band['from'];
            $to = $band['to'] ?? PHP_FLOAT_MAX;
            $rate = $band['rate'] / 100;

            if ($remainingIncome <= 0) {
                break;
            }

            if ($taxableIncome > $from) {
                $taxableInBand = min($remainingIncome, $to - $from);
                $tax += $taxableInBand * $rate;
                $remainingIncome -= $taxableInBand;
            }
        }

        $finalTax = $tax - $personalRelief;

        return max($finalTax, 0);
    }

    private function getDefaultNSSFParams(): array
    {
        return [
            'tier_i_limit' => 8000,
            'tier_ii_limit' => 72000,
            'rate' => 6,
        ];
    }

    private function getDefaultSHIFParams(): array
    {
        return [
            'rate' => 2.75,
            'min_contribution' => 300,
        ];
    }

    private function getDefaultAHLParams(): array
    {
        return [
            'rate' => 1.5,
        ];
    }

    private function getDefaultPAYEParams(): array
    {
        return [
            'personal_relief' => 2400,
            'bands' => $this->getDefaultPAYEBands(),
        ];
    }

    private function getDefaultPAYEBands(): array
    {
        return [
            ['from' => 0, 'to' => 24000, 'rate' => 10],
            ['from' => 24000, 'to' => 32333, 'rate' => 25],
            ['from' => 32333, 'to' => 500000, 'rate' => 30],
            ['from' => 500000, 'to' => 800000, 'rate' => 32.5],
            ['from' => 800000, 'to' => null, 'rate' => 35],
        ];
    }
}
