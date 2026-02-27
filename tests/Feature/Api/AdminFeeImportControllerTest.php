<?php

use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Permission\Models\Permission;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

test('admin with manage fees permission can import fees from Excel', function (): void {
    $term = new AcademicTerm;
    $term->name = 'Term 1';
    $term->term_number = '1';
    $term->academic_year = '2025';
    $term->start_date = now()->startOfYear();
    $term->end_date = now()->endOfYear();
    $term->is_active = true;
    $term->save();

    $class = SchoolClass::create([
        'name' => 'G2Green',
        'description' => 'Test class',
    ]);

    User::factory()->create([
        'name' => 'John Doe',
        'class_id' => $class->id,
    ]);

    $admin = User::factory()->create();

    /** @var Permission $permission */
    $permission = Permission::where('name', 'manage fees')->firstOrFail();
    $admin->givePermissionTo($permission);

    actingAs($admin);

    $file = UploadedFile::fake()->create('fees.xlsx');

    Excel::shouldReceive('toArray')
        ->once()
        ->withArgs(function ($import, $uploadedFile) use ($file): bool {
            return $import === null
                && $uploadedFile instanceof UploadedFile
                && $uploadedFile->getClientOriginalName() === $file->getClientOriginalName();
        })
        ->andReturn([
            [
                ['Class Name', 'Base Fee'],
                ['G2Green', '1500'],
            ],
            [
                ['Student Name', 'Class', 'Transport Fee'],
                ['John Doe', 'G2Green', '300'],
            ],
            [
                ['Activity Name', 'Price'],
                ['Skating', '500'],
            ],
            [
                ['Student Name', 'Class', 'Skating'],
                ['John Doe', 'G2Green', 'yes'],
            ],
        ]);

    $response = $this->postJson('/admin/api/fees/import', [
        'term_id' => $term->id,
        'file' => $file,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('updated_classes', 1);
    $response->assertJsonPath('updated_transport', 1);
    $response->assertJsonPath('activities_upserted', 1);
    $response->assertJsonPath('student_activities_created', 1);
    $response->assertJsonStructure(['not_found_students']);
});

test('import returns not_found_students when student does not exist', function (): void {
    $term = new AcademicTerm;
    $term->name = 'Term 1';
    $term->term_number = '1';
    $term->academic_year = '2025';
    $term->start_date = now()->startOfYear();
    $term->end_date = now()->endOfYear();
    $term->is_active = true;
    $term->save();

    SchoolClass::create(['name' => 'G1Green', 'description' => 'Test class']);

    $admin = User::factory()->create();
    $admin->givePermissionTo(Permission::where('name', 'manage fees')->firstOrFail());
    actingAs($admin);

    $file = UploadedFile::fake()->create('fees.xlsx');
    Excel::shouldReceive('toArray')->once()->andReturn([
        [['Class Name', 'Base Fee'], ['G1Green', '1500']],
        [['Student Name', 'Class', 'Transport Fee'], ['Austin Ndung\'u', 'G1Green', '300']],
        [['Activity Name', 'Price']],
        [['Student Name', 'Class'], ['Austin Ndung\'u', 'G1Green']],
    ]);

    $response = $this->postJson('/admin/api/fees/import', [
        'term_id' => $term->id,
        'file' => $file,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('not_found_students.0.name', "Austin Ndung'u");
    $response->assertJsonPath('not_found_students.0.class', 'G1Green');
});

test('admin can import fees from spreadsheet JSON', function (): void {
    $term = new AcademicTerm;
    $term->name = 'Term 1';
    $term->term_number = '1';
    $term->academic_year = '2025';
    $term->start_date = now()->startOfYear();
    $term->end_date = now()->endOfYear();
    $term->is_active = true;
    $term->save();

    $class = SchoolClass::create(['name' => 'G2Green', 'description' => 'Test']);
    User::factory()->create(['name' => 'John Doe', 'class_id' => $class->id]);

    $admin = User::factory()->create();
    $admin->givePermissionTo(Permission::where('name', 'manage fees')->firstOrFail());
    actingAs($admin);

    $response = $this->postJson('/admin/api/fees/import/from-spreadsheet', [
        'term_id' => $term->id,
        'class_fees' => [['G2Green', '1500']],
        'transport_fees' => [['John Doe', 'G2Green', '300', '']],
        'activities' => [['Skating', '500']],
        'student_activities' => [['John Doe', 'G2Green', 'yes']],
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('updated_classes', 1);
    $response->assertJsonPath('updated_transport', 1);
    $response->assertJsonPath('activities_upserted', 1);
    $response->assertJsonPath('student_activities_created', 1);
});

test('admin can import debit and credit balances from spreadsheet', function (): void {
    $term = new AcademicTerm;
    $term->name = 'Term 1';
    $term->term_number = '1';
    $term->academic_year = '2025';
    $term->start_date = now()->startOfYear();
    $term->end_date = now()->endOfYear();
    $term->is_active = true;
    $term->save();

    $class = SchoolClass::create(['name' => 'G2Green', 'description' => 'Test']);
    User::factory()->create(['name' => 'John Doe', 'class_id' => $class->id]);

    $admin = User::factory()->create();
    $admin->givePermissionTo(Permission::where('name', 'manage fees')->firstOrFail());
    actingAs($admin);

    $response = $this->postJson('/admin/api/fees/import/from-spreadsheet', [
        'term_id' => $term->id,
        'class_fees' => [],
        'transport_fees' => [],
        'activities' => [],
        'student_activities' => [],
        'debit_credit' => [
            ['John Doe', 'G2Green', '500', '100'],
        ],
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('debit_credit_updated', 1);

    $balance = \App\Models\StudentTermBalance::where('user_id', User::where('name', 'John Doe')->first()->id)
        ->where('academic_term_id', $term->id)
        ->first();
    expect($balance)->not->toBeNull();
    expect((float) $balance->debit_balance)->toBe(500.0);
    expect((float) $balance->credit_balance)->toBe(100.0);
});

test('admin can import amount paid from spreadsheet', function (): void {
    $term = new AcademicTerm;
    $term->name = 'Term 1';
    $term->term_number = '1';
    $term->academic_year = '2025';
    $term->start_date = now()->startOfYear();
    $term->end_date = now()->endOfYear();
    $term->is_active = true;
    $term->save();

    $class = SchoolClass::create(['name' => 'G2Green', 'description' => 'Test']);
    $user = User::factory()->create(['name' => 'John Doe', 'class_id' => $class->id]);

    $admin = User::factory()->create();
    $admin->givePermissionTo(Permission::where('name', 'manage fees')->firstOrFail());
    actingAs($admin);

    $response = $this->postJson('/admin/api/fees/import/from-spreadsheet', [
        'term_id' => $term->id,
        'class_fees' => [],
        'transport_fees' => [],
        'activities' => [],
        'student_activities' => [],
        'debit_credit' => [],
        'amount_paid' => [
            ['John Doe', 'G2Green', '2500'],
        ],
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('amount_paid_updated', 1);

    $balance = \App\Models\StudentTermBalance::where('user_id', $user->id)
        ->where('academic_term_id', $term->id)
        ->first();
    expect($balance)->not->toBeNull();
    expect((float) $balance->amount_paid)->toBe(2500.0);
});
