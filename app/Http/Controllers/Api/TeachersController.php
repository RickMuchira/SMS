<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class TeachersController extends Controller
{
    /**
     * Display a listing of teachers (users with teacher role).
     */
    public function index(Request $request): Response
    {
        $teachers = User::role('teacher')
            ->with('roles')
            ->orderBy('name')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->paginate($request->integer('per_page', 20));

        return response($teachers, Response::HTTP_OK);
    }

    /**
     * Store a newly created teacher account.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $teacherRole = Role::where('name', 'teacher')->first();
        if ($teacherRole !== null) {
            $user->assignRole($teacherRole);
        }

        return response([
            'user' => $user->fresh('roles'),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified teacher.
     */
    public function show(string $id): Response
    {
        $user = User::role('teacher')->with('roles')->findOrFail($id);

        return response([
            'user' => $user,
        ], Response::HTTP_OK);
    }

    /**
     * Update the specified teacher.
     */
    public function update(Request $request, string $id): Response
    {
        $user = User::role('teacher')->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

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

        return response([
            'user' => $user->fresh('roles'),
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified teacher account.
     */
    public function destroy(string $id): Response
    {
        $user = User::role('teacher')->findOrFail($id);
        $user->delete();

        return response()->noContent();
    }
}
