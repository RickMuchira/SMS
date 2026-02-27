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

        $identifier = trim($validated['identifier']);
        $password = trim($validated['password']);

        // Always use student email as identifier
        /** @var \App\Models\User|null $user */
        $user = User::where('email', $identifier)->first();

        $phones = [];
        if ($user !== null && $user->guardian_phone) {
            $phones[] = trim((string) $user->guardian_phone);
        }
        if ($user !== null && is_array($user->extra_guardians)) {
            foreach ($user->extra_guardians as $guardian) {
                if (! empty($guardian['phone'])) {
                    $phones[] = trim((string) $guardian['phone']);
                }
            }
        }

        $phones = array_values(array_unique($phones));

        // Password must match one of the guardian phone numbers
        if ($user === null || empty($phones) || ! in_array($password, $phones, true)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Ensure the stored password hash matches the phone the guardian used
        if (! Hash::check($password, $user->password)) {
            $user->password = Hash::make($password);
            $user->save();
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
