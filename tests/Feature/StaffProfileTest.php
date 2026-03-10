<?php

use App\Models\StaffDepartment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    \Spatie\Permission\Models\Permission::create(['name' => 'view staff']);
    \Spatie\Permission\Models\Permission::create(['name' => 'manage staff']);

    Role::create(['name' => 'super-admin']);
    Role::create(['name' => 'staff']);

    $this->seed(\Database\Seeders\StaffPermissionsSeeder::class);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('super-admin');
    $this->admin->givePermissionTo(['view staff', 'manage staff']);

    $this->seed(\Database\Seeders\StaffDepartmentSeeder::class);
});

test('can create staff profile', function () {
    $department = StaffDepartment::first();

    $response = $this->actingAs($this->admin)->postJson('/api/staff', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'job_title' => 'Teacher',
        'department_id' => $department->id,
        'employment_type' => 'full-time',
        'employment_status' => 'active',
        'gross_monthly_salary' => 50000,
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'employee_id', 'user']]);

    $this->assertDatabaseHas('staff_profiles', [
        'job_title' => 'Teacher',
        'gross_monthly_salary' => 50000,
    ]);
});

test('can list staff profiles', function () {
    $department = StaffDepartment::first();
    $user = User::factory()->create();
    StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    $response = $this->actingAs($this->admin)->getJson('/api/staff');

    $response->assertStatus(200)
        ->assertJsonStructure(['data', 'meta']);
});

test('can show specific staff profile', function () {
    $department = StaffDepartment::first();
    $user = User::factory()->create();
    $staffProfile = StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    $response = $this->actingAs($this->admin)->getJson("/api/staff/{$staffProfile->id}");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['id', 'employee_id', 'user', 'department']]);
});

test('can update staff profile', function () {
    $department = StaffDepartment::first();
    $user = User::factory()->create();
    $staffProfile = StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
        'gross_monthly_salary' => 50000,
    ]);

    $response = $this->actingAs($this->admin)->patchJson("/api/staff/{$staffProfile->id}", [
        'gross_monthly_salary' => 60000,
        'job_title' => 'Senior Teacher',
    ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('staff_profiles', [
        'id' => $staffProfile->id,
        'gross_monthly_salary' => 60000,
        'job_title' => 'Senior Teacher',
    ]);
});

test('can delete staff profile', function () {
    $department = StaffDepartment::first();
    $user = User::factory()->create();
    $staffProfile = StaffProfile::factory()->create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    $response = $this->actingAs($this->admin)->deleteJson("/api/staff/{$staffProfile->id}");

    $response->assertStatus(204);

    $this->assertDatabaseMissing('staff_profiles', [
        'id' => $staffProfile->id,
        'deleted_at' => null,
    ]);
});

test('employee ID is auto-generated', function () {
    $department = StaffDepartment::first();

    $response = $this->actingAs($this->admin)->postJson('/api/staff', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'job_title' => 'Teacher',
        'department_id' => $department->id,
        'employment_type' => 'full-time',
        'employment_status' => 'active',
        'gross_monthly_salary' => 50000,
    ]);

    $response->assertStatus(201);
    expect($response->json('data.employee_id'))->toStartWith('EMP');
});

test('can filter staff by department', function () {
    $dept1 = StaffDepartment::first();
    $dept2 = StaffDepartment::skip(1)->first();

    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    StaffProfile::factory()->create(['user_id' => $user1->id, 'department_id' => $dept1->id]);
    StaffProfile::factory()->create(['user_id' => $user2->id, 'department_id' => $dept2->id]);

    $response = $this->actingAs($this->admin)->getJson("/api/staff?department_id={$dept1->id}");

    $response->assertStatus(200);
    expect($response->json('meta.total'))->toBe(1);
});
