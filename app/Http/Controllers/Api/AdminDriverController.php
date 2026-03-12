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
     * List staff with driver/assistant designation flags (for admin/drivers page).
     * Uses same source as staff profiles; only staff with a profile can be designated.
     */
    public function index(Request $request): Response
    {
        $query = StaffProfile::with(['user.roles', 'department'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            })->orWhere('employee_id', 'like', "%{$search}%")
                ->orWhere('job_title', 'like', "%{$search}%");
        }

        if ($request->filled('employment_status')) {
            $query->where('employment_status', $request->string('employment_status'));
        }

        $perPage = $request->integer('per_page', 50);
        $staffProfiles = $query->paginate(min($perPage, 500));

        $data = $staffProfiles->getCollection()->map(function (StaffProfile $profile) {
            $roles = $profile->user->roles->pluck('name')->all();

            return [
                'id' => $profile->id,
                'user_id' => $profile->user_id,
                'employee_id' => $profile->employee_id,
                'user' => [
                    'id' => $profile->user->id,
                    'name' => $profile->user->name,
                    'email' => $profile->user->email,
                ],
                'job_title' => $profile->job_title,
                'department' => $profile->department ? [
                    'id' => $profile->department->id,
                    'name' => $profile->department->name,
                ] : null,
                'employment_status' => $profile->employment_status,
                'is_driver' => in_array('driver', $roles, true),
                'is_assistant' => in_array('assistant', $roles, true),
            ];
        });

        return response([
            'data' => $data,
            'meta' => [
                'current_page' => $staffProfiles->currentPage(),
                'last_page' => $staffProfiles->lastPage(),
                'per_page' => $staffProfiles->perPage(),
                'total' => $staffProfiles->total(),
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Update driver/assistant designation for a user (sync roles).
     * Only users with a staff profile can be designated.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_driver' => ['required', 'boolean'],
            'is_assistant' => ['required', 'boolean'],
        ]);

        if (! StaffProfile::where('user_id', $user->id)->exists()) {
            return response()->json(
                ['message' => 'Only staff with a profile can be designated as driver or assistant.'],
                422
            );
        }

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
            ->whereHas('staffProfile')
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
            ->whereHas('staffProfile')
            ->whereHas('roles', fn ($q) => $q->where('name', 'assistant'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $users]);
    }
}
