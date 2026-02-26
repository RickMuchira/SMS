<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(\Database\Seeders\RolePermissionSeeder::class);
});

test('user with view students permission can list students', function (): void {
    $user = User::factory()->create();
    $user->givePermissionTo('view students');

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/students');
    $response->assertSuccessful();
    $response->assertJsonPath('data', []);
});

test('user with manage students permission can create a student', function (): void {
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/students', [
        'name' => 'Jane Student',
        'email' => 'jane@example.com',
        'password' => 'password123',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('user.name', 'Jane Student');
    $response->assertJsonPath('user.email', 'jane@example.com');

    $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);
    $created = User::where('email', 'jane@example.com')->first();
    expect($created->hasRole('student'))->toBeTrue();
});

test('user without permission cannot list students', function (): void {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/students');
    $response->assertForbidden();
});
