<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
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

        /** @var \App\Models\User|null $user */
        $user = User::where('email', $identifier)->first();

        if ($user === null) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        // First, try the existing guardian / student login flow:
        // email identifies the student user; password must match one of the guardian phone numbers.
        $phones = [];
        if ($user->guardian_phone) {
            $phones[] = trim((string) $user->guardian_phone);
        }
        if (is_array($user->extra_guardians)) {
            foreach ($user->extra_guardians as $guardian) {
                if (! empty($guardian['phone'])) {
                    $phones[] = trim((string) $guardian['phone']);
                }
            }
        }

        $phones = array_values(array_unique($phones));

        $authenticated = false;

        if (! empty($phones) && in_array($password, $phones, true)) {
            // Guardian / student login using phone number as password.
            $authenticated = true;

            // Ensure the stored password hash matches the phone the guardian used.
            if (! Hash::check($password, $user->password)) {
                $user->password = Hash::make($password);
                $user->save();
            }
        } else {
            // Fallback path: allow staff designated as driver or assistant to log in
            // using their normal password, so they can use the transport mobile module.
            if (Hash::check($password, $user->password) && $user->hasAnyRole(['driver', 'assistant'])) {
                $authenticated = true;
            }
        }

        if (! $authenticated) {
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
            'school_location' => $this->schoolLocation(),
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
            'school_location' => $this->schoolLocation(),
        ], Response::HTTP_OK);
    }

    /**
     * @return array{latitude: float|null, longitude: float|null, address: string|null}
     */
    private function schoolLocation(): array
    {
        return [
            'latitude' => $this->toFloat(SystemSetting::get('school_latitude')),
            'longitude' => $this->toFloat(SystemSetting::get('school_longitude')),
            'address' => SystemSetting::get('school_address'),
        ];
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
