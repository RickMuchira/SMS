<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RoleNameGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = User::with('roles');

        if ($request->filled('role')) {
            $query->role($request->string('role'));
        }

        $perPage = (int) $request->input('per_page', 50);
        // Cap page size to avoid accidental huge responses
        if ($perPage < 1 || $perPage > 10000) {
            $perPage = 50;
        }

        $users = $query->orderBy('name')->paginate($perPage);

        return response($users, Response::HTTP_OK);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name,guard_name,web'],
        ]);

        // Get the current user's permissions
        $currentUser = $request->user();
        $userPermissions = $currentUser?->getAllPermissions()->pluck('name')->toArray() ?? [];

        // Validate that the user can only assign permissions they themselves have
        if (! empty($validated['permissions'])) {
            $invalidPermissions = array_diff($validated['permissions'], $userPermissions);

            if (! empty($invalidPermissions)) {
                return response([
                    'message' => 'You can only assign permissions that you have yourself.',
                    'invalid_permissions' => array_values($invalidPermissions),
                ], Response::HTTP_FORBIDDEN);
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Assign permissions if provided
        if (! empty($validated['permissions'])) {
            $user->givePermissionTo($validated['permissions']);

            // Generate and assign a role name based on permissions
            $roleName = RoleNameGeneratorService::generate($validated['permissions']);

            // Create or get the role
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

            // Sync role permissions
            $role->syncPermissions($validated['permissions']);

            // Assign the role to the user
            $user->assignRole($role);
        }

        return response([
            'user' => $user->fresh('roles'),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $user = User::with('roles')->findOrFail($id);

        return response([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_OK);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): Response
    {
        $user = User::findOrFail($id);

        // Protect super@gmail.com from being modified by others
        if ($user->email === 'super@gmail.com' && $request->user()?->email !== 'super@gmail.com') {
            return response([
                'message' => 'The primary super administrator account cannot be modified by others.',
            ], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'string', 'min:8'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name,guard_name,web'],
        ]);

        // Get the current user's permissions
        $currentUser = $request->user();
        $userPermissions = $currentUser?->getAllPermissions()->pluck('name')->toArray() ?? [];

        // Validate that the user can only assign permissions they themselves have
        if (array_key_exists('permissions', $validated) && ! empty($validated['permissions'])) {
            $invalidPermissions = array_diff($validated['permissions'], $userPermissions);

            if (! empty($invalidPermissions)) {
                return response([
                    'message' => 'You can only assign permissions that you have yourself.',
                    'invalid_permissions' => array_values($invalidPermissions),
                ], Response::HTTP_FORBIDDEN);
            }
        }

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (array_key_exists('password', $validated)) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Update permissions if provided
        if (array_key_exists('permissions', $validated)) {
            if (! empty($validated['permissions'])) {
                // Sync permissions
                $user->syncPermissions($validated['permissions']);

                // Generate and assign a role name based on permissions
                $roleName = RoleNameGeneratorService::generate($validated['permissions']);

                // Create or get the role
                $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

                // Sync role permissions
                $role->syncPermissions($validated['permissions']);

                // Assign the role to the user
                $user->syncRoles([$role->name]);
            } else {
                // Remove all permissions and roles
                $user->syncPermissions([]);
                $user->syncRoles([]);
            }
        }

        return response([
            'user' => $user->fresh('roles'),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id, Request $request): Response
    {
        $user = User::findOrFail($id);

        // Prevent deleting super@gmail.com
        if ($user->email === 'super@gmail.com') {
            return response([
                'message' => 'The primary super administrator account cannot be deleted.',
            ], Response::HTTP_FORBIDDEN);
        }

        $user->delete();

        return response()->noContent();
    }
}
