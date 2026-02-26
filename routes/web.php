<?php

use App\Http\Controllers\Admin\SchoolClassController as AdminSchoolClassPageController;
use App\Http\Controllers\Admin\StaffController as AdminStaffPageController;
use App\Http\Controllers\Admin\StudentController as AdminStudentPageController;
use App\Http\Controllers\Admin\SystemSettingsController;
use App\Http\Controllers\Admin\TeachersController as AdminTeachersPageController;
use App\Http\Controllers\Admin\TripController as AdminTripPageController;
use App\Http\Controllers\Admin\UserController as AdminUserPageController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\LocationController as ApiLocationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\SchoolClassController as ApiSchoolClassController;
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
