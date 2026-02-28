<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ModuleController extends Controller
{
    public function modulesAvailable(Request $request): Response
    {
        $user = $request->user();

        $modules = [
            [
                'key' => 'students',
                'label' => 'Student Module',
                'permissions' => [
                    'view students',
                    'manage students',
                ],
            ],
            [
                'key' => 'drivers',
                'label' => 'Driver Module',
                'permissions' => [
                    'view drivers',
                    'manage drivers',
                ],
            ],
            [
                'key' => 'fees',
                'label' => 'Fee Module',
                'permissions' => [
                    'view fees',
                    'manage fees',
                ],
            ],
            [
                'key' => 'transport',
                'label' => 'Transport Module',
                'permissions' => [
                    'view transport',
                    'manage transport',
                ],
            ],
            [
                'key' => 'results',
                'label' => 'Results Module',
                'permissions' => [
                    'view results',
                    'manage results',
                    'manage academics',
                ],
            ],
        ];

        $available = collect($modules)
            ->filter(function (array $module) use ($user): bool {
                foreach ($module['permissions'] as $permission) {
                    if ($user->can($permission)) {
                        return true;
                    }
                }

                return false;
            })
            ->values();

        return response([
            'modules' => $available,
        ], Response::HTTP_OK);
    }
}
