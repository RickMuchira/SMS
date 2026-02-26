<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Seed the initial super admin user if none exists.
     */
    public function run(): void
    {
        $email = 'super@gmail.com';
        $plainPassword = 'Muchira21110';

        $superAdminRole = Role::where('name', 'super-admin')->first();

        if ($superAdminRole === null) {
            return;
        }

        /** @var \App\Models\User $user */
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Super Admin',
                // Store a securely hashed password, never plain text.
                'password' => Hash::make($plainPassword),
            ],
        );

        if (! $user->hasRole($superAdminRole)) {
            $user->assignRole($superAdminRole);
        }
    }
}
