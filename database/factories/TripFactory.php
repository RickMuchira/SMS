<?php

namespace Database\Factories;

use App\Models\Bus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TripFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'type' => fake()->randomElement(['morning', 'evening']),
            'trip_number' => fake()->numberBetween(1, 10),
            'bus_id' => Bus::factory(),
            'driver_id' => User::factory(),
            'assistant_id' => fake()->optional(0.5)->passthrough(User::factory()),
            'trip_date' => fake()->dateTimeBetween('now', '+7 days'),
            'start_time' => fake()->time('H:i'),
            'status' => fake()->randomElement(['planned', 'in_progress', 'completed']),
        ];
    }
}
