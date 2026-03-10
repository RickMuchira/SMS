<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StaffDepartment>
 */
class StaffDepartmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $departments = [
            ['name' => 'Administration', 'code' => 'ADMIN'],
            ['name' => 'Teaching Staff', 'code' => 'TEACH'],
            ['name' => 'Finance', 'code' => 'FIN'],
            ['name' => 'IT', 'code' => 'IT'],
            ['name' => 'Support Staff', 'code' => 'SUPP'],
        ];

        $dept = fake()->randomElement($departments);

        return [
            'name' => $dept['name'],
            'code' => $dept['code'],
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
