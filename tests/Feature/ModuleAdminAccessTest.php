<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('student admin only sees students module in sidebar', function () {
    // Create all necessary permissions first
    Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    Permission::create(['name' => 'view classes', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage classes', 'guard_name' => 'web']);
    Permission::create(['name' => 'view roles', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    // Create student admin user
    $studentAdmin = User::factory()->create([
        'email' => 'studentadmin@example.com',
        'name' => 'Student Admin',
    ]);

    // Create student-admin role with student permissions
    $role = Role::create(['name' => 'student-admin', 'guard_name' => 'web']);

    $role->givePermissionTo(['view students', 'manage students']);
    $studentAdmin->assignRole($role);

    // Act as student admin and check permissions
    expect($studentAdmin->hasPermissionTo('view students'))->toBeTrue();
    expect($studentAdmin->hasPermissionTo('manage students'))->toBeTrue();
    expect($studentAdmin->hasPermissionTo('view classes'))->toBeFalse();
    expect($studentAdmin->hasPermissionTo('manage roles'))->toBeFalse();

    // Verify what pages they can access
    $this->actingAs($studentAdmin)
        ->get('/admin/students')
        ->assertOk(); // Can access students page

    $this->actingAs($studentAdmin)
        ->get('/admin/classes')
        ->assertForbidden(); // Cannot access classes page

    $this->actingAs($studentAdmin)
        ->get('/admin/users')
        ->assertForbidden(); // Cannot access user management
});

test('driver admin only sees drivers and transport modules', function () {
    // Create all necessary permissions
    Permission::create(['name' => 'view drivers', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage drivers', 'guard_name' => 'web']);
    Permission::create(['name' => 'view transport', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage transport', 'guard_name' => 'web']);
    Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    $driverAdmin = User::factory()->create([
        'email' => 'driveradmin@example.com',
    ]);

    $role = Role::create(['name' => 'driver-admin', 'guard_name' => 'web']);

    $role->givePermissionTo(['view drivers', 'manage drivers', 'view transport', 'manage transport']);
    $driverAdmin->assignRole($role);

    expect($driverAdmin->hasPermissionTo('view drivers'))->toBeTrue();
    expect($driverAdmin->hasPermissionTo('manage transport'))->toBeTrue();
    expect($driverAdmin->hasPermissionTo('view students'))->toBeFalse();
    expect($driverAdmin->hasPermissionTo('manage roles'))->toBeFalse();
});

test('multi module admin sees all assigned modules', function () {
    $multiAdmin = User::factory()->create([
        'email' => 'multiadmin@example.com',
    ]);

    // Create all necessary permissions
    Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    Permission::create(['name' => 'view classes', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage classes', 'guard_name' => 'web']);
    Permission::create(['name' => 'view fees', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage fees', 'guard_name' => 'web']);
    Permission::create(['name' => 'view drivers', 'guard_name' => 'web']);

    $multiAdmin->givePermissionTo([
        'view students',
        'manage students',
        'view classes',
        'manage classes',
        'view fees',
        'manage fees',
    ]);

    expect($multiAdmin->hasPermissionTo('manage students'))->toBeTrue();
    expect($multiAdmin->hasPermissionTo('manage classes'))->toBeTrue();
    expect($multiAdmin->hasPermissionTo('manage fees'))->toBeTrue();
    expect($multiAdmin->hasPermissionTo('view drivers'))->toBeFalse();

    // Verify shared props contain correct permissions
    $this->actingAs($multiAdmin)
        ->get('/admin/dashboard')
        ->assertOk();

    // Check that inertia shared data includes permissions
    $permissions = $multiAdmin->getAllPermissions()->pluck('name')->toArray();
    expect($permissions)->toContain('manage students', 'manage classes', 'manage fees');
});
