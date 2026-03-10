<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StaffProfile>
 */
class StaffProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_id' => 'EMP'.fake()->unique()->numberBetween(1000, 9999),
            'national_id_number' => fake()->unique()->numerify('########'),
            'date_of_birth' => fake()->date('Y-m-d', '-25 years'),
            'gender' => fake()->randomElement(['male', 'female']),
            'phone_number' => fake()->phoneNumber(),
            'personal_email' => fake()->unique()->safeEmail(),
            'home_address' => fake()->address(),
            'next_of_kin_name' => fake()->name(),
            'next_of_kin_relationship' => fake()->randomElement(['spouse', 'parent', 'sibling', 'child']),
            'next_of_kin_phone' => fake()->phoneNumber(),
            'profile_photo' => null,
            'job_title' => fake()->jobTitle(),
            'employment_type' => fake()->randomElement(['full-time', 'part-time', 'contract']),
            'date_of_joining' => fake()->dateTimeBetween('-5 years', 'now'),
            'employment_status' => 'active',
            'kra_pin' => fake()->bothify('A###?####?'),
            'nssf_number' => fake()->numerify('##########'),
            'sha_shif_number' => fake()->numerify('##########'),
            'bank_name' => fake()->randomElement(['KCB', 'Equity', 'Cooperative', 'NCBA', 'Absa']),
            'bank_account_number' => fake()->numerify('############'),
            'bank_branch' => fake()->city(),
            'gross_monthly_salary' => fake()->randomFloat(2, 30000, 200000),
            'allowances' => [
                ['name' => 'Transport', 'amount' => fake()->randomFloat(2, 5000, 15000)],
                ['name' => 'Housing', 'amount' => fake()->randomFloat(2, 10000, 30000)],
            ],
            'custom_deductions' => [],
        ];
    }
}
