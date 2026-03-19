<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Spatie\Permission\Models\Role;

class AdminDriverController extends Controller
{
    /**
     * List staff and admins with driver/assistant designation flags (for admin/drivers page).
     * Includes: staff with profiles + users who have manage drivers or manage transport (admins).
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search');
        $employmentStatus = $request->string('employment_status');
        $perPage = min($request->integer('per_page', 50), 500);

        $staffQuery = StaffProfile::with(['user.roles', 'department'])
            ->orderBy('created_at', 'desc');

        if ($search->isNotEmpty()) {
            $staffQuery->where(function ($q) use ($search) {
                $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"))
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%");
            });
        }

        if ($employmentStatus->isNotEmpty()) {
            $staffQuery->where('employment_status', $employmentStatus);
        }

        $staffProfiles = $staffQuery->get();
        $staffUserIds = $staffProfiles->pluck('user_id')->all();

        $adminUserIds = User::query()
            ->whereNotIn('id', $staffUserIds)
            ->where(function ($q) {
                $q->whereHas('permissions', fn ($p) => $p->whereIn('name', ['manage drivers', 'manage transport']))
                    ->orWhereHas('roles.permissions', fn ($p) => $p->whereIn('name', ['manage drivers', 'manage transport']));
            })
            ->when($search->isNotEmpty(), function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->with('roles')
            ->orderBy('name')
            ->get()
            ->pluck('id')
            ->all();

        $allUserIds = array_unique(array_merge($staffUserIds, $adminUserIds));
        $users = User::query()
            ->whereIn('id', $allUserIds)
            ->with(['roles', 'staffProfile.department'])
            ->orderBy('name')
            ->get();

        $profileMap = $staffProfiles->keyBy('user_id');

        $data = $users->map(function (User $user) use ($profileMap) {
            $profile = $profileMap->get($user->id);
            $roles = $user->roles->pluck('name')->all();

            return [
                'id' => $profile?->id ?? 'u'.$user->id,
                'user_id' => $user->id,
                'employee_id' => $profile?->employee_id ?? null,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'job_title' => $profile?->job_title ?? null,
                'department' => $profile?->department ? [
                    'id' => $profile->department->id,
                    'name' => $profile->department->name,
                ] : null,
                'employment_status' => $profile?->employment_status ?? 'active',
                'is_driver' => in_array('driver', $roles, true),
                'is_assistant' => in_array('assistant', $roles, true),
            ];
        })->values();

        $total = $data->count();
        $page = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $perPage;
        $paginated = $data->slice($offset, $perPage)->values();
        $lastPage = (int) ceil($total / $perPage) ?: 1;

        return response([
            'data' => $paginated,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Update driver/assistant designation for a user (sync roles).
     * Staff and admins (manage drivers / manage transport) can be designated.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_driver' => ['required', 'boolean'],
            'is_assistant' => ['required', 'boolean'],
        ]);

        $driverRole = Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'web']);
        $assistantRole = Role::firstOrCreate(['name' => 'assistant', 'guard_name' => 'web']);

        if ($validated['is_driver']) {
            $user->assignRole($driverRole);
        } else {
            $user->removeRole($driverRole);
        }

        if ($validated['is_assistant']) {
            $user->assignRole($assistantRole);
        } else {
            $user->removeRole($assistantRole);
        }

        $user->load('roles');
        $roles = $user->roles->pluck('name')->all();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'is_driver' => in_array('driver', $roles, true),
            'is_assistant' => in_array('assistant', $roles, true),
        ]);
    }

    /**
     * List users designated as drivers (for bus/trip dropdowns).
     */
    public function drivers(): JsonResponse
    {
        $users = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'driver'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $users]);
    }

    /**
     * List users designated as assistants (for bus/trip dropdowns).
     */
    public function assistants(): JsonResponse
    {
        $users = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'assistant'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $users]);
    }

    /**
     * Get transport-related roles and permissions for a specific staff user.
     */
    public function transportPermissions(User $user): JsonResponse
    {
        $user->load('roles', 'permissions');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'roles' => $user->getRoleNames(),
            'permissions' => [
                'view transport' => $user->can('view transport'),
                'manage transport' => $user->can('manage transport'),
                'execute trips' => $user->can('execute trips'),
            ],
        ]);
    }

    /**
     * Update transport-related permissions for a specific staff user.
     */
    public function updateTransportPermissions(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'view_transport' => ['required', 'boolean'],
            'manage_transport' => ['required', 'boolean'],
            'execute_trips' => ['required', 'boolean'],
        ]);

        $map = [
            'view transport' => $validated['view_transport'],
            'manage transport' => $validated['manage_transport'],
            'execute trips' => $validated['execute_trips'],
        ];

        foreach ($map as $permissionName => $enabled) {
            if ($enabled) {
                $user->givePermissionTo($permissionName);
            } else {
                $user->revokePermissionTo($permissionName);
            }
        }

        $user->load('roles', 'permissions');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'roles' => $user->getRoleNames(),
            'permissions' => [
                'view transport' => $user->can('view transport'),
                'manage transport' => $user->can('manage transport'),
                'execute trips' => $user->can('execute trips'),
            ],
        ]);
    }
}
