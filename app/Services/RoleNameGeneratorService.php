<?php

namespace App\Services;

class RoleNameGeneratorService
{
    /**
     * Generate a descriptive role name based on selected permissions.
     *
     * Examples:
     * - ['manage students', 'view students'] → "Students Admin"
     * - ['manage students', 'manage classes'] → "Students & Classes Admin"
     * - ['manage students', 'manage drivers', 'manage fees'] → "Students, Drivers & Fees Admin"
     */
    public static function generate(array $permissions): string
    {
        if (empty($permissions)) {
            return 'Custom Role';
        }

        // Map permissions to module names
        $moduleMap = [
            'students' => ['view students', 'manage students'],
            'classes' => ['view classes', 'manage classes'],
            'drivers' => ['view drivers', 'manage drivers'],
            'fees' => ['view fees', 'manage fees'],
            'transport' => ['view transport', 'manage transport'],
            'staff' => ['view staff', 'manage staff'],
            'teachers' => ['view teachers', 'manage teachers'],
            'roles' => ['view roles', 'manage roles'],
            'permissions' => ['view permissions', 'manage permissions'],
        ];

        // Identify which modules are covered
        $modules = [];
        foreach ($moduleMap as $moduleName => $modulePermissions) {
            $hasAny = array_intersect($permissions, $modulePermissions);
            if (! empty($hasAny)) {
                $modules[] = ucfirst($moduleName);
            }
        }

        if (empty($modules)) {
            return 'Custom Role';
        }

        // Format the role name
        if (count($modules) === 1) {
            return $modules[0].' Admin';
        }

        if (count($modules) === 2) {
            return implode(' & ', $modules).' Admin';
        }

        // For 3+ modules: "Module1, Module2 & Module3 Admin"
        $last = array_pop($modules);

        return implode(', ', $modules).' & '.$last.' Admin';
    }
}
