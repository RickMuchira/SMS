<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AcademicTermSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = (int) date('Y');
        $academicYear = (string) $currentYear;

        // Avoid creating duplicates if seeder is run multiple times
        if (AcademicTerm::query()->where('academic_year', $academicYear)->exists()) {
            return;
        }

        $now = Carbon::now();

        AcademicTerm::query()->create([
            'name' => 'Term 1',
            'term_number' => '1',
            'academic_year' => $academicYear,
            'start_date' => $now->copy()->startOfMonth(),
            'end_date' => $now->copy()->startOfMonth()->addMonths(3)->subDay(),
            'is_active' => true,
        ]);

        AcademicTerm::query()->create([
            'name' => 'Term 2',
            'term_number' => '2',
            'academic_year' => $academicYear,
            'start_date' => $now->copy()->startOfMonth()->addMonths(3),
            'end_date' => $now->copy()->startOfMonth()->addMonths(6)->subDay(),
            'is_active' => false,
        ]);

        AcademicTerm::query()->create([
            'name' => 'Term 3',
            'term_number' => '3',
            'academic_year' => $academicYear,
            'start_date' => $now->copy()->startOfMonth()->addMonths(6),
            'end_date' => $now->copy()->startOfMonth()->addMonths(9)->subDay(),
            'is_active' => false,
        ]);
    }
}
