<?php

use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(\Database\Seeders\RolePermissionSeeder::class);
});

test('import supports up to three guardians with repeated headers', function (): void {
    SchoolClass::create(['name' => 'G2Green', 'description' => 'Test class']);
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');
    Sanctum::actingAs($user);

    $csv = "Student Name,Class,Guardian Name,Phone Number,Relationship,Guardian Name,Phone Number,Relationship,Guardian Name,Phone Number,Relationship\n"
        .'Alice Muthoni,G2Green,Mama Alice,0712345678,Mother,Baba Alice,0711111111,Father,Auntie Alice,0722222222,Aunt';

    $file = UploadedFile::fake()->createWithContent('students-multi-guardian.csv', $csv);

    $response = $this->postJson('/api/students/import', ['file' => $file]);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 1);
    $response->assertJsonPath('updated', 0);

    $student = User::role('student')->where('name', 'Alice Muthoni')->first();
    expect($student)->not->toBeNull();
    expect($student->guardian_name)->toBe('Mama Alice');
    expect($student->guardian_phone)->toBe('0712345678');
    expect($student->guardian_relationship)->toBe('Mother');
    expect($student->extra_guardians)->toMatchArray([
        ['name' => 'Baba Alice', 'phone' => '0711111111', 'relationship' => 'Father'],
        ['name' => 'Auntie Alice', 'phone' => '0722222222', 'relationship' => 'Aunt'],
    ]);
});
