<?php

use App\Http\Controllers\Admin\FeeActivityController as AdminFeeActivityPageController;
use App\Http\Controllers\Admin\FeeClassController as AdminFeeClassPageController;
use App\Http\Controllers\Admin\FeeController as AdminFeePageController;
use App\Http\Controllers\Admin\FeeSummaryController as AdminFeeSummaryPageController;
use App\Http\Controllers\Admin\ResultController as AdminResultPageController;
use App\Http\Controllers\Admin\ResultEditController;
use App\Http\Controllers\Admin\ResultViewController;
use App\Http\Controllers\Admin\SchoolClassController as AdminSchoolClassPageController;
use App\Http\Controllers\Admin\StaffController as AdminStaffPageController;
use App\Http\Controllers\Admin\StreamComparisonController;
use App\Http\Controllers\Admin\StudentController as AdminStudentPageController;
use App\Http\Controllers\Admin\SystemSettingsController;
use App\Http\Controllers\Admin\TeachersController as AdminTeachersPageController;
use App\Http\Controllers\Admin\TripController as AdminTripPageController;
use App\Http\Controllers\Admin\UserController as AdminUserPageController;
use App\Http\Controllers\Api\AdminFeeCreateStudentsController;
use App\Http\Controllers\Api\AdminFeeImportController;
use App\Http\Controllers\Api\AdminFeeImportFromSpreadsheetController;
use App\Http\Controllers\Api\AdminFeePreviewController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\FeeActivityController as ApiFeeActivityController;
use App\Http\Controllers\Api\FeeClassController as ApiFeeClassController;
use App\Http\Controllers\Api\LocationController as ApiLocationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ResultAnalyticsController;
use App\Http\Controllers\Api\ResultImportController;
use App\Http\Controllers\Api\ResultUpdateController;
use App\Http\Controllers\Api\SchoolClassController as ApiSchoolClassController;
use App\Http\Controllers\Api\StudentController as ApiStudentController;
use App\Http\Controllers\Api\TeacherClassAssignmentController;
use App\Http\Controllers\Api\TripController as ApiTripController;
use App\Http\Controllers\Transport\LocationController as TransportLocationPageController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Register routes (redirect to login when registration is disabled)
Route::get('register', fn () => Inertia::render('auth/register'))->name('register');
Route::post('register', fn () => redirect()->route('login'))->name('register.store');

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('admin/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('admin.dashboard');

    Route::get('admin', function () {
        return redirect()->route('admin.dashboard');
    })->name('admin');

    Route::get('admin/users', [AdminUserPageController::class, 'index'])
        ->middleware('permission:manage roles')
        ->name('admin.users.index');

    Route::get('admin/students', [AdminStudentPageController::class, 'index'])
        ->middleware('permission:view students')
        ->name('admin.students.index');

    Route::get('admin/staff', [AdminStaffPageController::class, 'index'])
        ->middleware('permission:view staff')
        ->name('admin.staff.index');

    Route::get('admin/teachers', [AdminTeachersPageController::class, 'index'])
        ->middleware('permission:view teachers')
        ->name('admin.teachers.index');

    Route::get('admin/classes', [AdminSchoolClassPageController::class, 'index'])
        ->middleware('permission:manage classes')
        ->name('admin.classes.index');

    Route::get('admin/fees', [AdminFeePageController::class, 'index'])
        ->middleware('permission:view fees')
        ->name('admin.fees.index');

    Route::get('admin/fees/activities', [AdminFeeActivityPageController::class, 'index'])
        ->middleware('permission:manage fees')
        ->name('admin.fees.activities.index');

    Route::get('admin/fees/classes', [AdminFeeClassPageController::class, 'index'])
        ->middleware('permission:manage fees')
        ->name('admin.fees.classes.index');

    Route::get('admin/fees/summary', [AdminFeeSummaryPageController::class, 'index'])
        ->middleware('permission:view fees')
        ->name('admin.fees.summary.index');

    Route::get('admin/results', [AdminResultPageController::class, 'index'])
        ->middleware('permission:view results|manage results|manage academics')
        ->name('admin.results.index');

    Route::get('admin/results/view', [ResultViewController::class, 'index'])
        ->middleware('permission:view results|manage results|manage academics')
        ->name('admin.results.view');

    Route::get('admin/results/edit', [ResultEditController::class, 'index'])
        ->middleware('permission:manage results|manage academics')
        ->name('admin.results.edit');

    Route::get('admin/results/streams', [StreamComparisonController::class, 'index'])
        ->middleware('permission:view results|manage results|manage academics')
        ->name('admin.results.streams');

    Route::get('admin/transport/trips', AdminTripPageController::class)
        ->middleware('permission:manage transport')
        ->name('admin.transport.trips.index');

    // Driver / assistant location marking page (can also be used by admins during setup).
    Route::get('transport/mark-location', [TransportLocationPageController::class, 'index'])
        ->name('transport.mark-location');

    // Admin user management API used by the Inertia UI.
    // Uses the web guard + session, so it works when you're logged into the web app.
    Route::prefix('admin/api')->group(function () {
        // User management
        Route::middleware('permission:manage roles')->group(function () {
            Route::apiResource('users', AdminUserController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
            Route::get('permissions', [PermissionController::class, 'index'])->name('admin.api.permissions.index');
        });

        // Transport management
        Route::middleware('permission:manage transport')->group(function () {
            Route::apiResource('transport/trips', ApiTripController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        });

        // Class management (used by admin/students UI & student-admins).
        Route::middleware('permission:manage classes')->group(function () {
            Route::apiResource('classes', ApiSchoolClassController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        });
        // Classes list for teacher assignment (view classes or manage academics).
        Route::middleware('permission:view classes|manage classes|manage academics')->group(function () {
            Route::get('classes-for-assignment', fn () => response()->json(
                \App\Models\SchoolClass::orderBy('name')->get(['id', 'name', 'grade_code'])
            ))->name('admin.api.classes-for-assignment');
        });

        // Fee management (admin UI)
        Route::middleware('permission:manage fees')->group(function () {
            Route::post('fees/import', AdminFeeImportController::class)->name('admin.api.fees.import');
            Route::post('fees/import/from-spreadsheet', AdminFeeImportFromSpreadsheetController::class)->name('admin.api.fees.import.from-spreadsheet');
            Route::post('fees/import/preview', AdminFeePreviewController::class)->name('admin.api.fees.import.preview');
            Route::apiResource('fees/activities', ApiFeeActivityController::class)->only(['index', 'store', 'update', 'destroy']);
            Route::apiResource('fees/classes', ApiFeeClassController::class)->only(['index', 'update']);
        });
        Route::middleware(['permission:manage fees', 'permission:manage students'])->group(function () {
            Route::post('fees/import/create-students', AdminFeeCreateStudentsController::class)->name('admin.api.fees.import.create-students');
        });

        // Student management (admin UI, uses web guard + session).
        Route::middleware('permission:view students|manage students')->group(function () {
            Route::get('students', [ApiStudentController::class, 'index'])->name('admin.api.students.index');
            Route::get('students/duplicates', [ApiStudentController::class, 'duplicates'])->name('admin.api.students.duplicates');
            Route::get('students/{student}', [ApiStudentController::class, 'show'])->name('admin.api.students.show');
        });
        // Result import & teacher-class assignments (academics)
        Route::middleware('permission:manage results|manage academics')->group(function () {
            Route::post('results/import/preview', [ResultImportController::class, 'preview'])->name('admin.api.results.import.preview');
            Route::post('results/import', [ResultImportController::class, 'import'])->name('admin.api.results.import');
            Route::get('teacher-class-assignments', [TeacherClassAssignmentController::class, 'index'])->name('admin.api.teacher-class-assignments.index');
            Route::post('teacher-class-assignments', [TeacherClassAssignmentController::class, 'store'])->name('admin.api.teacher-class-assignments.store');
            Route::delete('teacher-class-assignments/{teacherClassAssignment}', [TeacherClassAssignmentController::class, 'destroy'])->name('admin.api.teacher-class-assignments.destroy');
        });

        // Results analytics (view)
        Route::middleware('permission:view results|manage results|manage academics')->group(function () {
            Route::get('results/class/{classId}/{termId}', [ResultAnalyticsController::class, 'classResults'])->name('admin.api.results.class');
            Route::get('results/student/{studentId}', [ResultAnalyticsController::class, 'studentResults'])->name('admin.api.results.student');
            Route::post('results/streams/compare', [StreamComparisonController::class, 'compare'])->name('admin.api.results.streams.compare');
        });

        // Results management (edit/delete)
        Route::middleware('permission:manage results|manage academics')->group(function () {
            Route::put('results/{resultId}', [ResultUpdateController::class, 'update'])->name('admin.api.results.update');
            Route::post('results/bulk-update', [ResultUpdateController::class, 'bulkUpdate'])->name('admin.api.results.bulk-update');
            Route::delete('results/{resultId}', [ResultUpdateController::class, 'destroy'])->name('admin.api.results.destroy');
            Route::delete('results/student/{studentId}', [ResultUpdateController::class, 'destroyStudent'])->name('admin.api.results.destroy-student');
            Route::delete('results/bulk-destroy', [ResultUpdateController::class, 'bulkDestroy'])->name('admin.api.results.bulk-destroy');
        });

        Route::middleware('permission:manage students')->group(function () {
            Route::post('students', [ApiStudentController::class, 'store'])->name('admin.api.students.store');
            Route::post('students/import', [ApiStudentController::class, 'import'])->name('admin.api.students.import');
            Route::delete('students/bulk', [ApiStudentController::class, 'bulkDestroy'])->name('admin.api.students.bulk-destroy');
            Route::match(['put', 'patch'], 'students/{student}', [ApiStudentController::class, 'update'])->name('admin.api.students.update');
            Route::delete('students/{student}', [ApiStudentController::class, 'destroy'])->name('admin.api.students.destroy');
        });
    });

    // Transport location API for marking pickup / dropoff locations.
    Route::post('transport/locations', [ApiLocationController::class, 'store'])
        ->name('transport.locations.store');

    // System settings (only super@gmail.com)
    Route::middleware([\App\Http\Middleware\EnsureSuperAdmin::class])->group(function () {
        Route::get('admin/settings', [SystemSettingsController::class, 'index'])
            ->name('admin.settings.index');
        Route::post('admin/settings', [SystemSettingsController::class, 'update'])
            ->name('admin.settings.update');
    });
});

// Dedicated admin login page that still posts to the normal Fortify login route.
Route::get('admin/login', function (\Illuminate\Http\Request $request) {
    return Inertia::render('auth/login', [
        'canResetPassword' => Features::enabled(Features::resetPasswords()),
        'canRegister' => false,
        'status' => $request->session()->get('status'),
        'mode' => 'admin',
    ]);
})->name('admin.login');

require __DIR__.'/settings.php';
