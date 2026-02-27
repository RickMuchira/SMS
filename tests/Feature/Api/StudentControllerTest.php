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

test('import accepts Full Name column (header variation)', function (): void {
    SchoolClass::create(['name' => 'G2Green', 'description' => 'Test class']);
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');
    Sanctum::actingAs($user);

    $csv = "Full Name,Class,Guardian Phone,Guardian Name\nAlice Muthoni,G2Green,0712345678,Mama Alice\nBob Wanjiru,G2Green,0723456789,Baba Bob";
    $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

    $response = $this->postJson('/api/students/import', ['file' => $file]);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 2);
    $response->assertJsonPath('updated', 0);
    expect(User::role('student')->count())->toBe(2);
});

test('import prevents siblings overwriting each other (email-first deduplication)', function (): void {
    SchoolClass::create(['name' => 'G2Green', 'description' => 'Test class']);
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');
    Sanctum::actingAs($user);

    $csv = "full_name,class_name,guardian_phone,guardian_name\nAlice Muthoni,G2Green,0712345678,Mama Alice\nBob Muthoni,G2Green,0712345678,Mama Alice";
    $file = UploadedFile::fake()->createWithContent('siblings.csv', $csv);

    $response = $this->post('/api/students/import', ['file' => $file], ['Accept' => 'application/json']);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 2);
    $response->assertJsonPath('updated', 0);
    $alice = User::role('student')->where('name', 'Alice Muthoni')->first();
    $bob = User::role('student')->where('name', 'Bob Muthoni')->first();
    expect($alice)->not->toBeNull();
    expect($bob)->not->toBeNull();
    expect($alice->id)->not->toBe($bob->id);
    expect($alice->guardian_phone)->toBe('0712345678');
    expect($bob->guardian_phone)->toBe('0712345678');
});

test('re-import updates existing student instead of creating duplicate with name2@', function (): void {
    SchoolClass::create(['name' => 'G2Green', 'description' => 'Test class']);
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');
    Sanctum::actingAs($user);

    $csv = "full_name,class_name,guardian_phone\nAlice Muthoni,G2Green,0712345678";
    $file1 = UploadedFile::fake()->createWithContent('first.csv', $csv);
    $this->post('/api/students/import', ['file' => $file1], ['Accept' => 'application/json']);

    expect(User::role('student')->count())->toBe(1);
    $alice = User::role('student')->where('name', 'Alice Muthoni')->first();
    expect($alice->email)->toContain('@');
    $originalEmail = $alice->email;

    $file2 = UploadedFile::fake()->createWithContent('second.csv', $csv);
    $response = $this->post('/api/students/import', ['file' => $file2], ['Accept' => 'application/json']);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 0);
    $response->assertJsonPath('updated', 1);
    expect(User::role('student')->count())->toBe(1);
    $aliceAfter = User::role('student')->where('name', 'Alice Muthoni')->first();
    expect($aliceAfter->email)->toBe($originalEmail);
});

test('import updates existing student when same email (duplicate row in file)', function (): void {
    SchoolClass::create(['name' => 'G2Green', 'description' => 'Test class']);
    $user = User::factory()->create();
    $user->givePermissionTo('manage students');
    Sanctum::actingAs($user);

    $csv = "full_name,class_name,guardian_phone\nAlice Muthoni,G2Green,0712345678\nAlice Muthoni,G2Green,0712345678";
    $file = UploadedFile::fake()->createWithContent('duplicates.csv', $csv);

    $response = $this->postJson('/api/students/import', ['file' => $file]);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 1);
    $response->assertJsonPath('updated', 1);
    expect(User::role('student')->count())->toBe(1);
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
