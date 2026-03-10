<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffProfileRequest;
use App\Http\Requests\UpdateStaffProfileRequest;
use App\Http\Resources\StaffProfileResource;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    public function index(Request $request): Response
    {
        $query = StaffProfile::with(['user.roles', 'department'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            })->orWhere('employee_id', 'like', "%{$search}%")
                ->orWhere('job_title', 'like', "%{$search}%")
                ->orWhere('phone_number', 'like', "%{$search}%");
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }

        if ($request->filled('employment_status')) {
            $query->where('employment_status', $request->string('employment_status'));
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->string('employment_type'));
        }

        $staffProfiles = $query->paginate($request->integer('per_page', 20));

        return response([
            'data' => StaffProfileResource::collection($staffProfiles),
            'meta' => [
                'current_page' => $staffProfiles->currentPage(),
                'last_page' => $staffProfiles->lastPage(),
                'per_page' => $staffProfiles->perPage(),
                'total' => $staffProfiles->total(),
            ],
        ], Response::HTTP_OK);
    }

    public function store(StoreStaffProfileRequest $request): Response
    {
        DB::beginTransaction();

        try {
            $fullName = $request->string('name');
            $mobileNumber = $request->string('phone_number');

            $username = $this->generateUsername($fullName);
            $password = $this->convertMobileTo07Format($mobileNumber);

            $existingUser = User::where('name', $username)->first();
            if ($existingUser && ! $existingUser->staffProfile) {
                $user = $existingUser;
            } else {
                $user = User::create([
                    'name' => $username,
                    'email' => $username.'@staff.local',
                    'password' => Hash::make($password),
                ]);
            }

            $staffRole = Role::where('name', 'staff')->first();
            if ($staffRole !== null && ! $user->hasRole('staff')) {
                $user->assignRole($staffRole);
            }

            $employeeId = $this->generateEmployeeId();

            $staffProfile = StaffProfile::create([
                'user_id' => $user->id,
                'employee_id' => $employeeId,
                'national_id_number' => $request->filled('national_id_number') ? $request->string('national_id_number') : null,
                'date_of_birth' => $request->date('date_of_birth'),
                'gender' => $request->filled('gender') ? $request->string('gender') : null,
                'phone_number' => $request->filled('phone_number') ? $request->string('phone_number') : null,
                'personal_email' => $request->filled('personal_email') ? $request->string('personal_email') : null,
                'home_address' => $request->filled('home_address') ? $request->string('home_address') : null,
                'next_of_kin_name' => $request->filled('next_of_kin_name') ? $request->string('next_of_kin_name') : null,
                'next_of_kin_relationship' => $request->filled('next_of_kin_relationship') ? $request->string('next_of_kin_relationship') : null,
                'next_of_kin_phone' => $request->filled('next_of_kin_phone') ? $request->string('next_of_kin_phone') : null,
                'profile_photo' => $request->filled('profile_photo') ? $request->string('profile_photo') : null,
                'job_title' => $request->filled('job_title') ? $request->string('job_title') : null,
                'department_id' => $request->filled('department_id') ? $request->integer('department_id') : null,
                'employment_type' => $request->string('employment_type'),
                'date_of_joining' => $request->date('date_of_joining'),
                'employment_status' => $request->string('employment_status'),
                'tsc_number' => $request->filled('tsc_number') ? $request->string('tsc_number') : null,
                'kra_pin' => $request->filled('kra_pin') ? $request->string('kra_pin') : null,
                'nssf_number' => $request->filled('nssf_number') ? $request->string('nssf_number') : null,
                'sha_shif_number' => $request->filled('sha_shif_number') ? $request->string('sha_shif_number') : null,
                'bank_name' => $request->filled('bank_name') ? $request->string('bank_name') : null,
                'bank_account_number' => $request->filled('bank_account_number') ? $request->string('bank_account_number') : null,
                'bank_branch' => $request->filled('bank_branch') ? $request->string('bank_branch') : null,
                'gross_monthly_salary' => $request->float('gross_monthly_salary'),
                'allowances' => $request->input('allowances', []),
                'custom_deductions' => $request->input('custom_deductions', []),
            ]);

            DB::commit();

            $staffProfile->load(['user.roles', 'department']);

            return response([
                'data' => new StaffProfileResource($staffProfile),
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(string $id): Response
    {
        $staffProfile = StaffProfile::with(['user.roles', 'department', 'payrollRecords'])
            ->findOrFail($id);

        return response([
            'data' => new StaffProfileResource($staffProfile),
        ], Response::HTTP_OK);
    }

    public function update(UpdateStaffProfileRequest $request, string $id): Response
    {
        $staffProfile = StaffProfile::findOrFail($id);

        DB::beginTransaction();

        try {
            if ($request->has(['name', 'email', 'password'])) {
                $userData = [];
                if ($request->filled('name')) {
                    $userData['name'] = $request->string('name');
                }
                if ($request->filled('email')) {
                    $userData['email'] = $request->string('email');
                }
                if ($request->filled('password')) {
                    $userData['password'] = Hash::make($request->string('password'));
                }
                $staffProfile->user->update($userData);
            }

            $profileData = $request->only([
                'national_id_number',
                'date_of_birth',
                'gender',
                'phone_number',
                'personal_email',
                'home_address',
                'next_of_kin_name',
                'next_of_kin_relationship',
                'next_of_kin_phone',
                'profile_photo',
                'job_title',
                'department_id',
                'employment_type',
                'date_of_joining',
                'employment_status',
                'tsc_number',
                'kra_pin',
                'nssf_number',
                'sha_shif_number',
                'bank_name',
                'bank_account_number',
                'bank_branch',
                'gross_monthly_salary',
                'allowances',
                'custom_deductions',
            ]);

            $staffProfile->update(array_filter($profileData, fn ($value) => $value !== null));

            DB::commit();

            $staffProfile->load(['user.roles', 'department']);

            return response([
                'data' => new StaffProfileResource($staffProfile),
            ], Response::HTTP_OK);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function destroy(string $id): Response
    {
        $staffProfile = StaffProfile::findOrFail($id);

        DB::beginTransaction();

        try {
            $user = $staffProfile->user;
            $staffProfile->delete();
            $user->delete();

            DB::commit();

            return response()->noContent();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function generateEmployeeId(): string
    {
        $lastProfile = StaffProfile::orderBy('id', 'desc')->first();
        $nextNumber = $lastProfile ? ((int) substr($lastProfile->employee_id, 3)) + 1 : 1;

        return 'EMP'.str_pad((string) $nextNumber, 5, '0', STR_PAD_LEFT);
    }

    private function generateUsername(string $fullName): string
    {
        $names = preg_split('/\s+/', trim($fullName));
        $firstTwo = array_slice($names, 0, 2);
        $username = implode('.', array_map('strtolower', $firstTwo));

        return $username;
    }

    private function convertMobileTo07Format(string $mobile): string
    {
        $cleaned = preg_replace('/[^\d]/', '', $mobile);

        if (str_starts_with($cleaned, '254')) {
            $cleaned = '0'.substr($cleaned, 3);
        }

        return $cleaned;
    }
}
