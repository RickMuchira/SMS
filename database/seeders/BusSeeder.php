<?php

namespace Database\Seeders;

use App\Models\Bus;
use Illuminate\Database\Seeder;

class BusSeeder extends Seeder
{
    public function run(): void
    {
        $buses = [
            ['registration_number' => 'KDG 116G', 'capacity' => 40, 'status' => 'active'],
            ['registration_number' => 'KDA 220A', 'capacity' => 35, 'status' => 'active'],
            ['registration_number' => 'KDB 550B', 'capacity' => 50, 'status' => 'active'],
            ['registration_number' => 'KDC 880C', 'capacity' => 30, 'status' => 'maintenance'],
        ];

        foreach ($buses as $busData) {
            Bus::firstOrCreate(
                ['registration_number' => $busData['registration_number']],
                $busData
            );
        }

        $this->command->info('Buses seeded successfully.');
    }
}
