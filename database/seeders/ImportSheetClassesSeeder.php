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
        $classes = [
            ['name' => 'G2Green', 'grade_code' => 'G2'],
            ['name' => 'PP2Green', 'grade_code' => 'PP2'],
            ['name' => 'G2Red', 'grade_code' => 'G2'],
            ['name' => 'G3Green', 'grade_code' => 'G3'],
            ['name' => 'PP2Red', 'grade_code' => 'PP2'],
            ['name' => 'G5', 'grade_code' => 'G5'],
            ['name' => 'PP1Red', 'grade_code' => 'PP1'],
            ['name' => 'G4', 'grade_code' => 'G4'],
            ['name' => 'G1Green', 'grade_code' => 'G1'],
            ['name' => 'PG', 'grade_code' => null],
            ['name' => 'PP1Green', 'grade_code' => 'PP1'],
            ['name' => 'G3Red', 'grade_code' => 'G3'],
            ['name' => 'G6', 'grade_code' => 'G6'],
        ];

        foreach ($classes as $c) {
            SchoolClass::updateOrCreate(
                ['name' => $c['name']],
                ['description' => 'Imported from student sheet', 'grade_code' => $c['grade_code'] ?? null]
            );
        }
    }
}
