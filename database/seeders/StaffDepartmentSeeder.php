<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class StaffDepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Administration',
                'code' => 'ADMIN',
                'description' => 'Administrative staff including principals, deputy principals, and office staff',
                'is_active' => true,
            ],
            [
                'name' => 'Teaching Staff',
                'code' => 'TEACH',
                'description' => 'Teachers and academic staff',
                'is_active' => true,
            ],
            [
                'name' => 'Finance',
                'code' => 'FIN',
                'description' => 'Finance and accounting department',
                'is_active' => true,
            ],
            [
                'name' => 'IT Department',
                'code' => 'IT',
                'description' => 'Information technology and systems staff',
                'is_active' => true,
            ],
            [
                'name' => 'Support Staff',
                'code' => 'SUPP',
                'description' => 'Support staff including cleaners, security, and maintenance',
                'is_active' => true,
            ],
            [
                'name' => 'Transport',
                'code' => 'TRANS',
                'description' => 'Transport department including drivers and coordinators',
                'is_active' => true,
            ],
        ];

        foreach ($departments as $department) {
            \App\Models\StaffDepartment::create($department);
        }
    }
}
