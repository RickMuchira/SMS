<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): Response
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = $validated['identifier'];
        $password = $validated['password'];

        // Determine if identifier is email or phone
        $user = null;
        if (str_contains($identifier, '@')) {
            // Looks like email
            $user = User::where('email', $identifier)->first();
        } else {
            // Treat as phone number
            $user = User::where('guardian_phone', $identifier)->first();
        }

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Log the user in
        Auth::login($user);

        $token = $user->createToken('api-token')->plainTextToken;

        return response([
            'token' => $token,
            'user' => $user->only(['id', 'name', 'email']),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_OK);
    }

    public function logout(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        if ($user !== null && $user->currentAccessToken() !== null) {
            $user->currentAccessToken()->delete();
        }

        return response()->noContent();
    }

    public function me(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return response([
            'user' => $user->only(['id', 'name', 'email']),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], Response::HTTP_OK);
    }
}
