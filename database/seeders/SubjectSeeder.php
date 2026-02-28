<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subjects = [
            ['name' => 'Mathematics', 'code' => 'math', 'aliases' => ['math', 'maths']],
            ['name' => 'Language', 'code' => 'language', 'aliases' => ['language', 'lang']],
            ['name' => 'Environment', 'code' => 'env', 'aliases' => ['env', 'environment']],
            ['name' => 'Creative', 'code' => 'creative', 'aliases' => ['creative']],
            ['name' => 'Literacy', 'code' => 'literacy', 'aliases' => ['literacy', 'n/w', 'nw']],
            ['name' => 'Inter', 'code' => 'inter', 'aliases' => ['inter']],
            ['name' => 'Art', 'code' => 'art', 'aliases' => ['art']],
            ['name' => 'English', 'code' => 'english', 'aliases' => ['english', 'eng']],
            ['name' => 'Kiswahili', 'code' => 'kiswahili', 'aliases' => ['kiswahili', 'kisw']],
            ['name' => 'CRE', 'code' => 'cre', 'aliases' => ['cre', 'c.r.e']],
            ['name' => 'C/A', 'code' => 'ca', 'aliases' => ['c/a', 'ca', 'c.a']],
            ['name' => 'S/T', 'code' => 'st', 'aliases' => ['s/t', 'st', 's.t']],
            ['name' => 'Agriculture', 'code' => 'agri', 'aliases' => ['agri', 'agriculture']],
            ['name' => 'SST', 'code' => 'sst', 'aliases' => ['sst', 'social studies']],
        ];

        foreach ($subjects as $s) {
            Subject::updateOrCreate(
                ['code' => $s['code']],
                ['name' => $s['name'], 'aliases' => $s['aliases'] ?? null]
            );
        }
    }
}
