<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use Illuminate\Database\Seeder;

class ImportSheetClassesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $names = [
            'G2Green',
            'PP2Green',
            'G2Red',
            'G3Green',
            'PP2Red',
            'G5',
            'PP1Red',
            'G4',
            'G1Green',
            'PG',
            'PP1Green',
            'G3Red',
            'G6',
        ];

        foreach ($names as $name) {
            SchoolClass::firstOrCreate(
                ['name' => $name],
                ['description' => 'Imported from student sheet']
            );
        }
    }
}
