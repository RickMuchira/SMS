#!/usr/bin/env php
<?php

/*
|--------------------------------------------------------------------------
| Test Student Admin Login Flow
|--------------------------------------------------------------------------
|
| This script simulates the complete login flow to verify everything works.
|
*/

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

echo "\n";
echo "╔════════════════════════════════════════════════════════════╗\n";
echo "║        STUDENT ADMIN LOGIN & PERMISSIONS TEST              ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n";
echo "\n";

// Test 1: User exists
echo "1. Checking if user exists...\n";
$user = User::where('email', 'student@gmail.com')->first();
if (! $user) {
    echo "   ❌ FAIL: User not found\n";
    exit(1);
}
echo "   ✓ User found (ID: {$user->id})\n\n";

// Test 2: Password verification
echo "2. Testing password hash...\n";
if (! Hash::check('Muchira21110', $user->password)) {
    echo "   ❌ FAIL: Password verification failed\n";
    exit(1);
}
echo "   ✓ Password hash is correct\n\n";

// Test 3: Email verification
echo "3. Checking email verification...\n";
if (! $user->email_verified_at) {
    echo "   ❌ FAIL: Email not verified\n";
    exit(1);
}
echo "   ✓ Email is verified ({$user->email_verified_at})\n\n";

// Test 4: Role assignment
echo "4. Checking role assignment...\n";
if (! $user->hasRole('student-admin')) {
    echo "   ❌ FAIL: User does not have student-admin role\n";
    exit(1);
}
echo "   ✓ Has student-admin role\n\n";

// Test 5: Permissions
echo "5. Checking permissions...\n";
$requiredPermissions = ['view students', 'manage students', 'view classes', 'manage classes'];
foreach ($requiredPermissions as $permission) {
    if (! $user->can($permission)) {
        echo "   ❌ FAIL: Missing permission: {$permission}\n";
        exit(1);
    }
    echo "   ✓ Has permission: {$permission}\n";
}
echo "\n";

// Test 6: Authentication attempt
echo "6. Testing Laravel authentication...\n";
$credentials = [
    'email' => 'student@gmail.com',
    'password' => 'Muchira21110',
];

if (! Auth::attempt($credentials)) {
    echo "   ❌ FAIL: Auth::attempt() failed\n";
    exit(1);
}
echo "   ✓ Authentication successful\n";
echo '   ✓ Logged in as: '.Auth::user()->email."\n\n";

// Clean up
Auth::logout();

echo "╔════════════════════════════════════════════════════════════╗\n";
echo "║                  ✓ ALL TESTS PASSED                        ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n";
echo "\n";
echo "Login details:\n";
echo "  URL: http://localhost:8000/admin/login\n";
echo "  Email: student@gmail.com\n";
echo "  Password: Muchira21110\n";
echo "\n";
echo "After login, navigate to:\n";
echo "  http://localhost:8000/admin/classes\n";
echo "\n";
echo "You should be able to:\n";
echo "  ✓ View all classes\n";
echo "  ✓ Create new classes\n";
echo "  ✓ Edit existing classes\n";
echo "  ✓ Delete classes\n";
echo "\n";
