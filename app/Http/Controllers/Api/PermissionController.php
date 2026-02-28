<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * Get all permissions grouped by module.
     * Returns only permissions the current user has (so they can't assign what they don't have).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get all permissions the current user has
        $userPermissions = $user?->getAllPermissions()->pluck('name')->toArray() ?? [];

        // Define module groupings
        $modules = [
            'students' => [
                'label' => 'Students Module',
                'permissions' => ['view students', 'manage students'],
            ],
            'classes' => [
                'label' => 'Classes Module',
                'permissions' => ['view classes', 'manage classes'],
            ],
            'drivers' => [
                'label' => 'Drivers Module',
                'permissions' => ['view drivers', 'manage drivers'],
            ],
            'fees' => [
                'label' => 'Fees Module',
                'permissions' => ['view fees', 'manage fees'],
            ],
            'transport' => [
                'label' => 'Transport Module',
                'permissions' => ['view transport', 'manage transport'],
            ],
            'staff' => [
                'label' => 'Staff Module',
                'permissions' => ['view staff', 'manage staff'],
            ],
            'teachers' => [
                'label' => 'Teachers Module',
                'permissions' => ['view teachers', 'manage teachers'],
            ],
            'results' => [
                'label' => 'Results Module',
                'permissions' => ['view results', 'manage results', 'manage academics'],
            ],
            'management' => [
                'label' => 'System Management',
                'permissions' => ['view roles', 'manage roles', 'view permissions', 'manage permissions'],
            ],
        ];

        // Filter modules to only show permissions the user has
        $availableModules = [];

        foreach ($modules as $key => $module) {
            $availablePermissions = array_filter(
                $module['permissions'],
                fn (string $perm): bool => in_array($perm, $userPermissions, true)
            );

            // Only include the module if the user has at least one permission in it
            if (! empty($availablePermissions)) {
                $availableModules[$key] = [
                    'label' => $module['label'],
                    'permissions' => array_values($availablePermissions),
                ];
            }
        }

        return response([
            'modules' => $availableModules,
            'userPermissions' => $userPermissions,
        ], Response::HTTP_OK);
    }
}
