<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TripStop>
 */
class TripStopFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'student_id' => User::factory(),
            'order_sequence' => 1,
            'latitude' => fake()->latitude(-1.4, -1.2),
            'longitude' => fake()->longitude(36.7, 36.9),
            'address' => fake()->address(),
            'pickup_notes' => fake()->optional(0.5)->sentence(),
            'status' => 'pending',
        ];
    }
}
