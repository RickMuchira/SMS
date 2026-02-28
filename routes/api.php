<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\RoleAssignmentController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SchoolClassController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\TeachersController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::get('fees', [FeeController::class, 'index']);
        Route::get('fees/{studentFee}', [FeeController::class, 'show']);

        Route::get('results', [ResultController::class, 'index']);
    });
});

// Admin + internal APIs used by the Inertia (web) UI.
// These use the normal "web" session guard, not Sanctum API tokens.
Route::middleware(['auth'])->group(function (): void {
    Route::apiResource('roles', RoleController::class);
    Route::apiResource('permissions', PermissionController::class)->only(['index', 'show']);

    Route::post('assign-role-to-user', [RoleAssignmentController::class, 'assignRoleToUser'])
        ->name('assign-role-to-user');

    Route::post('assign-permissions-to-role', [RoleAssignmentController::class, 'assignPermissionsToRole'])
        ->name('assign-permissions-to-role');

    Route::get('modules-available', [ModuleController::class, 'modulesAvailable'])
        ->name('modules-available');

    Route::middleware('permission:manage roles')->group(function (): void {
        Route::apiResource('classes', SchoolClassController::class);
    });

    // Student listing & detail: allow either "view students" or "manage students".
    Route::middleware('permission:view students|manage students')->group(function (): void {
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{student}', [StudentController::class, 'show']);
    });
    Route::middleware('permission:manage students')->group(function (): void {
        Route::post('students', [StudentController::class, 'store']);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::match(['put', 'patch'], 'students/{student}', [StudentController::class, 'update']);
        Route::delete('students/{student}', [StudentController::class, 'destroy']);
    });

    Route::middleware('permission:view staff')->group(function (): void {
        Route::get('staff', [StaffController::class, 'index']);
        Route::get('staff/{staff}', [StaffController::class, 'show']);
    });
    Route::middleware('permission:manage staff')->group(function (): void {
        Route::post('staff', [StaffController::class, 'store']);
        Route::match(['put', 'patch'], 'staff/{staff}', [StaffController::class, 'update']);
        Route::delete('staff/{staff}', [StaffController::class, 'destroy']);
    });

    Route::middleware('permission:view teachers')->group(function (): void {
        Route::get('teachers', [TeachersController::class, 'index']);
        Route::get('teachers/{teacher}', [TeachersController::class, 'show']);
    });
    Route::middleware('permission:manage teachers')->group(function (): void {
        Route::post('teachers', [TeachersController::class, 'store']);
        Route::match(['put', 'patch'], 'teachers/{teacher}', [TeachersController::class, 'update']);
        Route::delete('teachers/{teacher}', [TeachersController::class, 'destroy']);
    });

    Route::apiResource('drivers', DriverController::class);

    // System settings (public read, super-admin write)
    Route::get('system-settings', [SystemSettingController::class, 'index']);
    Route::middleware('role:super-admin')->group(function (): void {
        Route::post('system-settings', [SystemSettingController::class, 'update']);
        Route::delete('system-settings/logo', [SystemSettingController::class, 'deleteLogo']);
    });
}
);
