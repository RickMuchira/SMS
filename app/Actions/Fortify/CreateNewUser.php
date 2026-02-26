<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
        ]);

        // Bootstrap: automatically grant the first registered user the "super-admin" role.
        // Subsequent users will not be auto-promoted once a super-admin already exists.
        if (! User::role('super-admin')->exists()) {
            $superAdminRole = Role::where('name', 'super-admin')->first();

            if ($superAdminRole !== null) {
                $user->assignRole($superAdminRole);
            }
        }

        return $user;
    }
}
