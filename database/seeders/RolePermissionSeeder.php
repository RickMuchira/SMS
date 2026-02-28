<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modules = [
            'students' => [
                'view students',
                'manage students',
            ],
            'classes' => [
                'view classes',
                'manage classes',
            ],
            'drivers' => [
                'view drivers',
                'manage drivers',
            ],
            'fees' => [
                'view fees',
                'manage fees',
            ],
            'transport' => [
                'view transport',
                'manage transport',
            ],
            'staff' => [
                'view staff',
                'manage staff',
            ],
            'teachers' => [
                'view teachers',
                'manage teachers',
            ],
            'academics' => [
                'view results',
                'manage results',
                'manage academics',
            ],
        ];

        $managementPermissions = [
            'view roles',
            'manage roles',
            'view permissions',
            'manage permissions',
        ];

        $createdPermissions = collect();

        foreach ($modules as $modulePermissions) {
            foreach ($modulePermissions as $permissionName) {
                $createdPermissions->push(
                    Permission::firstOrCreate(
                        ['name' => $permissionName, 'guard_name' => 'web']
                    )
                );
            }
        }

        foreach ($managementPermissions as $permissionName) {
            $createdPermissions->push(
                Permission::firstOrCreate(
                    ['name' => $permissionName, 'guard_name' => 'web']
                )
            );
        }

        $superAdminRole = Role::firstOrCreate(
            ['name' => 'super-admin', 'guard_name' => 'web']
        );

        $studentAdminRole = Role::firstOrCreate(
            ['name' => 'student-admin', 'guard_name' => 'web']
        );

        $driverAdminRole = Role::firstOrCreate(
            ['name' => 'driver-admin', 'guard_name' => 'web']
        );

        $academicAdminRole = Role::firstOrCreate(
            ['name' => 'academic-admin', 'guard_name' => 'web']
        );

        Role::firstOrCreate(['name' => 'teacher', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'student', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);

        $superAdminRole->syncPermissions($createdPermissions);

        $studentAdminRole->syncPermissions(
            Permission::whereIn('name', [
                'view students',
                'manage students',
                'view classes',
                'manage classes',
            ])->get()
        );

        $driverAdminRole->syncPermissions(
            Permission::whereIn('name', ['view drivers', 'manage drivers', 'view transport', 'manage transport'])->get()
        );

        $academicAdminRole->syncPermissions(
            Permission::whereIn('name', [
                'view results',
                'manage results',
                'manage academics',
                'view students',
                'view classes',
            ])->get()
        );
    }
}
