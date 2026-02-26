<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class StudentAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create or update the student-admin user
        $user = User::updateOrCreate(
            ['email' => 'student@gmail.com'],
            [
                'name' => 'Student Admin',
                'password' => 'Muchira21110',
                'email_verified_at' => now(),
            ],
        );

        // Assign the student-admin role
        $user->syncRoles(['student-admin']);

        $this->command->info("Student admin created: {$user->email}");
        $this->command->info("Password: Muchira21110");
        $this->command->info("Permissions: " . $user->getAllPermissions()->pluck('name')->implode(', '));
    }
}
