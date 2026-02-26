<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAssignmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:manage roles')->only(['assignRoleToUser', 'assignPermissionsToRole']);
    }

    public function assignRoleToUser(Request $request): Response
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        /** @var User $user */
        $user = User::findOrFail($validated['user_id']);

        $user->syncRoles([$validated['role']]);

        return response([
            'user' => $user->only(['id', 'name', 'email']),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_OK);
    }

    public function assignPermissionsToRole(Request $request): Response
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'exists:roles,name'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::where('name', $validated['role'])->firstOrFail();

        $permissions = Permission::whereIn('name', $validated['permissions'])->get();

        $role->syncPermissions($permissions);

        return response([
            'role' => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ], Response::HTTP_OK);
    }
}
