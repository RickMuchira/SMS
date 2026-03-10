<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class StaffPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'manage payroll',
            'view payroll',
            'approve payroll',
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $permission]);
        }

        $superAdminRole = \Spatie\Permission\Models\Role::where('name', 'super-admin')->first();
        if ($superAdminRole !== null) {
            $superAdminRole->givePermissionTo($permissions);
        }

        $hrRole = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'hr-manager']);
        $hrRole->givePermissionTo(['manage payroll', 'view payroll', 'approve payroll']);

        $accountantRole = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'accountant']);
        $accountantRole->givePermissionTo(['view payroll', 'approve payroll']);
    }
}
