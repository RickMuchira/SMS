<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TransportPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view transport' => 'View transport module',
            'manage transport' => 'Manage buses, routes, and trip planning',
            'execute trips' => 'Execute trips and update stop statuses (drivers/assistants)',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web']
            );
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->givePermissionTo(array_keys($permissions));

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->givePermissionTo(['view transport', 'manage transport']);

        $driver = Role::firstOrCreate(['name' => 'driver']);
        $driver->givePermissionTo(['view transport', 'execute trips']);

        $assistant = Role::firstOrCreate(['name' => 'assistant']);
        $assistant->givePermissionTo(['view transport', 'execute trips']);

        $this->command->info('Transport permissions created and assigned successfully.');
    }
}
