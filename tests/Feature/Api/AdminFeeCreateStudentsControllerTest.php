<?php

use App\Models\SchoolClass;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

test('admin with manage fees and manage students can create students from approval list', function (): void {
    SchoolClass::create(['name' => 'G1Green', 'description' => 'Test class']);

    $admin = User::factory()->create();
    $admin->givePermissionTo([
        Permission::where('name', 'manage fees')->firstOrFail(),
        Permission::where('name', 'manage students')->firstOrFail(),
    ]);
    actingAs($admin);

    $response = $this->postJson('/admin/api/fees/import/create-students', [
        'students' => [
            ['name' => 'Austin Ndung\'u', 'class' => 'G1Green'],
        ],
    ]);

    $response->assertCreated();
    $response->assertJsonPath('created.0.name', "Austin Ndung'u");
    $response->assertJsonPath('created.0.class', 'G1Green');
    expect(User::role('student')->where('name', "Austin Ndung'u")->count())->toBe(1);
});
