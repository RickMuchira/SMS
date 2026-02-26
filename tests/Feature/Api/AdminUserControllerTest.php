<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('super admin can create a new user with custom permissions', function () {
    // Create super admin user
    $superAdmin = User::factory()->create([
        'email' => 'super@gmail.com',
        'name' => 'Super Admin',
    ]);

    // Create permissions
    $viewStudents = Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    $manageStudents = Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    $viewClasses = Permission::create(['name' => 'view classes', 'guard_name' => 'web']);
    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    // Give super admin all permissions (including manage roles which is required to access the endpoint)
    $superAdmin->givePermissionTo([$viewStudents, $manageStudents, $viewClasses, $manageRoles]);

    // Attempt to create a new user with custom permissions
    $response = $this->actingAs($superAdmin)
        ->postJson('/admin/api/users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'permissions' => ['view students', 'manage students'],
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'roles', 'permissions']);

    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'name' => 'Test User',
    ]);

    // Check that the user has the correct permissions
    $user = User::where('email', 'test@example.com')->first();
    expect($user->hasPermissionTo('view students'))->toBeTrue();
    expect($user->hasPermissionTo('manage students'))->toBeTrue();
    expect($user->hasPermissionTo('view classes'))->toBeFalse();

    // Check that a role was auto-generated
    expect($user->roles->count())->toBeGreaterThan(0);
    expect($user->roles->first()->name)->toContain('Admin');
});

test('admin cannot assign permissions they do not have', function () {
    // Create a regular admin user with limited permissions
    $admin = User::factory()->create([
        'email' => 'admin@example.com',
    ]);

    $viewStudents = Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    $manageStudents = Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    $viewDrivers = Permission::create(['name' => 'view drivers', 'guard_name' => 'web']);
    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    // Admin only has student permissions
    $admin->givePermissionTo([$viewStudents, $manageStudents, $manageRoles]);

    // Attempt to create a user with driver permissions (which admin doesn't have)
    $response = $this->actingAs($admin)
        ->postJson('/admin/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'permissions' => ['view drivers'],
        ]);

    $response->assertStatus(403)
        ->assertJsonFragment(['message' => 'You can only assign permissions that you have yourself.']);
});

test('admin can create users with permissions they have', function () {
    $admin = User::factory()->create(['email' => 'admin@example.com']);

    $viewStudents = Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    $manageStudents = Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    $admin->givePermissionTo([$viewStudents, $manageStudents, $manageRoles]);

    $response = $this->actingAs($admin)
        ->postJson('/admin/api/users', [
            'name' => 'Sub Admin',
            'email' => 'subadmin@example.com',
            'password' => 'password123',
            'permissions' => ['view students'],
        ]);

    $response->assertStatus(201);

    $user = User::where('email', 'subadmin@example.com')->first();
    expect($user->hasPermissionTo('view students'))->toBeTrue();
});

test('user with multiple module permissions gets correct role name', function () {
    $admin = User::factory()->create(['email' => 'admin@example.com']);

    Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    Permission::create(['name' => 'view drivers', 'guard_name' => 'web']);
    Permission::create(['name' => 'manage drivers', 'guard_name' => 'web']);
    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    $admin->givePermissionTo(Permission::all());

    $response = $this->actingAs($admin)
        ->postJson('/admin/api/users', [
            'name' => 'Multi Admin',
            'email' => 'multi@example.com',
            'password' => 'password123',
            'permissions' => ['manage students', 'manage drivers'],
        ]);

    $response->assertStatus(201);

    $user = User::where('email', 'multi@example.com')->first();
    expect($user->roles->first()->name)->toContain('Admin');
    // Should contain references to both modules
    expect($user->roles->first()->name)->toMatch('/Students.*Drivers|Drivers.*Students/');
});

test('super admin can update user permissions', function () {
    $superAdmin = User::factory()->create(['email' => 'super@gmail.com']);
    $targetUser = User::factory()->create(['email' => 'target@example.com']);

    $viewStudents = Permission::create(['name' => 'view students', 'guard_name' => 'web']);
    $manageStudents = Permission::create(['name' => 'manage students', 'guard_name' => 'web']);
    $viewClasses = Permission::create(['name' => 'view classes', 'guard_name' => 'web']);
    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);

    $superAdmin->givePermissionTo(Permission::all());
    $targetUser->givePermissionTo([$viewStudents]);

    $response = $this->actingAs($superAdmin)
        ->patchJson("/admin/api/users/{$targetUser->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'permissions' => ['view students', 'manage students', 'view classes'],
        ]);

    $response->assertStatus(200);

    $targetUser->refresh();
    expect($targetUser->hasPermissionTo('manage students'))->toBeTrue();
    expect($targetUser->hasPermissionTo('view classes'))->toBeTrue();
});

test('super gmail account cannot be deleted', function () {
    $superAdmin = User::factory()->create(['email' => 'super@gmail.com']);

    $manageRoles = Permission::create(['name' => 'manage roles', 'guard_name' => 'web']);
    $superAdmin->givePermissionTo($manageRoles);

    $response = $this->actingAs($superAdmin)
        ->deleteJson("/admin/api/users/{$superAdmin->id}");

    $response->assertStatus(403)
        ->assertJsonFragment(['message' => 'The primary super administrator account cannot be deleted.']);

    $this->assertDatabaseHas('users', ['email' => 'super@gmail.com']);
});
