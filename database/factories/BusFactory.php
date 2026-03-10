<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Bus>
 */
class BusFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        static $registrationNumber = 0;

        $registrationNumber++;
        $letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
        $letter = $letters[array_rand($letters)];

        return [
            'registration_number' => sprintf('KD%s %d%s', $letter, 100 + $registrationNumber, $letter),
            'capacity' => fake()->numberBetween(20, 60),
            'status' => fake()->randomElement(['active', 'active', 'active', 'inactive', 'maintenance']),
            'notes' => fake()->optional(0.3)->sentence(),
        ];
    }
}
