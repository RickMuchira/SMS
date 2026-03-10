<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DeductionConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configurations = [
            [
                'name' => 'NSSF 2025',
                'code' => 'NSSF_2025',
                'type' => 'nssf',
                'parameters' => [
                    'tier_i_limit' => 8000,
                    'tier_ii_limit' => 72000,
                    'rate' => 6,
                ],
                'is_active' => true,
                'effective_from' => '2025-01-01',
                'effective_to' => null,
                'description' => 'NSSF contribution rates as of 2025. Tier I: 6% of first KES 8,000. Tier II: 6% of KES 8,001 - 72,000.',
            ],
            [
                'name' => 'SHIF 2025',
                'code' => 'SHIF_2025',
                'type' => 'shif',
                'parameters' => [
                    'rate' => 2.75,
                    'min_contribution' => 300,
                ],
                'is_active' => true,
                'effective_from' => '2025-01-01',
                'effective_to' => null,
                'description' => 'Social Health Insurance Fund (SHIF) - 2.75% of gross salary, minimum KES 300.',
            ],
            [
                'name' => 'AHL 2025',
                'code' => 'AHL_2025',
                'type' => 'ahl',
                'parameters' => [
                    'rate' => 1.5,
                ],
                'is_active' => true,
                'effective_from' => '2025-01-01',
                'effective_to' => null,
                'description' => 'Affordable Housing Levy - 1.5% of gross salary (employee & employer each).',
            ],
            [
                'name' => 'PAYE 2025',
                'code' => 'PAYE_2025',
                'type' => 'paye',
                'parameters' => [
                    'personal_relief' => 2400,
                    'bands' => [
                        ['from' => 0, 'to' => 24000, 'rate' => 10],
                        ['from' => 24000, 'to' => 32333, 'rate' => 25],
                        ['from' => 32333, 'to' => 500000, 'rate' => 30],
                        ['from' => 500000, 'to' => 800000, 'rate' => 32.5],
                        ['from' => 800000, 'to' => null, 'rate' => 35],
                    ],
                ],
                'is_active' => true,
                'effective_from' => '2025-01-01',
                'effective_to' => null,
                'description' => 'Pay As You Earn (PAYE) tax bands and rates for 2025. Progressive tax with personal relief of KES 2,400/month.',
            ],
        ];

        foreach ($configurations as $config) {
            \App\Models\DeductionConfiguration::create($config);
        }
    }
}
