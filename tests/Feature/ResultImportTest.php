<?php

use App\Models\AcademicResult;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SubjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(SubjectSeeder::class);
});

test('result import preview matches exact student names', function (): void {
    $term = AcademicTerm::factory()->create(['is_active' => true]);
    $class = SchoolClass::create([
        'name' => 'PP1Red',
        'grade_code' => 'PP1',
        'description' => 'PP1 Red',
    ]);
    $student = User::factory()->create([
        'name' => 'John Doe',
        'class_id' => $class->id,
    ]);
    $student->assignRole(Role::findByName('student'));

    $admin = User::factory()->create();
    $admin->givePermissionTo('manage results');

    actingAs($admin);

    $rows = [
        ['Student Name', 'Math', 'Language', 'ENV', 'Creative'],
        ['John Doe', '85', '90', '78', '82'],
    ];

    $response = $this->postJson('/admin/api/results/import/preview', [
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'rows' => $rows,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('matched.0.input_name', 'John Doe');
    $response->assertJsonPath('matched.0.user_id', $student->id);
    $response->assertJsonPath('matched.0.scores.math', '85');
});

test('result import preview reports unmatched and missing students', function (): void {
    $term = AcademicTerm::factory()->create();
    $class = SchoolClass::create([
        'name' => 'G2Green',
        'grade_code' => 'G2',
        'description' => 'Grade 2 Green',
    ]);
    $student1 = User::factory()->create(['name' => 'Alice Muthoni', 'class_id' => $class->id]);
    $student1->assignRole(Role::findByName('student'));
    $student2 = User::factory()->create(['name' => 'Bob Wanjiru', 'class_id' => $class->id]);
    $student2->assignRole(Role::findByName('student'));

    $admin = User::factory()->create();
    $admin->givePermissionTo('manage results');

    actingAs($admin);

    // Alice matches exactly, "Robert Wanjiru" might match Bob (similarity), Charlie is unknown
    $rows = [
        ['Student Name', 'Math', 'Eng', 'Kisw'],
        ['Alice Muthoni', '90', '85', '88'],
        ['Unknown Student', '70', '75', '80'],
    ];

    $response = $this->postJson('/admin/api/results/import/preview', [
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'rows' => $rows,
    ]);

    $response->assertSuccessful();
    expect($response->json('matched'))->toHaveCount(1);
    expect($response->json('unmatched'))->toHaveCount(1);
    expect($response->json('missing'))->toHaveCount(1); // Bob has no result
});

test('result import saves confirmed matches', function (): void {
    $term = AcademicTerm::factory()->create();
    $class = SchoolClass::create([
        'name' => 'PP1Green',
        'grade_code' => 'PP1',
        'description' => 'PP1 Green',
    ]);
    $student = User::factory()->create(['name' => 'Jane Smith', 'class_id' => $class->id]);
    $student->assignRole(Role::findByName('student'));

    $admin = User::factory()->create();
    $admin->givePermissionTo('manage results');

    actingAs($admin);

    $response = $this->postJson('/admin/api/results/import', [
        'school_class_id' => $class->id,
        'academic_term_id' => $term->id,
        'rows' => [
            [
                'user_id' => $student->id,
                'scores' => ['math' => '92', 'language' => '88', 'env' => '85', 'creative' => '90'],
            ],
        ],
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('created', 4);

    expect(AcademicResult::where('user_id', $student->id)->count())->toBe(4);
});
