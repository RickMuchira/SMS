<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GeneratePayrollRequest;
use App\Http\Resources\PayrollRecordResource;
use App\Models\PayrollRecord;
use App\Models\StaffProfile;
use App\Services\PayrollCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function __construct(
        private PayrollCalculationService $payrollService
    ) {}

    public function index(Request $request): Response
    {
        $query = PayrollRecord::with(['staffProfile.user', 'staffProfile.department'])
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc');

        if ($request->filled('year')) {
            $query->where('year', $request->integer('year'));
        }

        if ($request->filled('month')) {
            $query->where('month', $request->integer('month'));
        }

        if ($request->filled('staff_profile_id')) {
            $query->where('staff_profile_id', $request->integer('staff_profile_id'));
        }

        if ($request->filled('department_id')) {
            $query->whereHas('staffProfile', function ($q) use ($request) {
                $q->where('department_id', $request->integer('department_id'));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $payrollRecords = $query->paginate($request->integer('per_page', 20));

        return response([
            'data' => PayrollRecordResource::collection($payrollRecords),
            'meta' => [
                'current_page' => $payrollRecords->currentPage(),
                'last_page' => $payrollRecords->lastPage(),
                'per_page' => $payrollRecords->perPage(),
                'total' => $payrollRecords->total(),
            ],
        ], Response::HTTP_OK);
    }

    public function generate(GeneratePayrollRequest $request): Response
    {
        $year = $request->integer('year');
        $month = $request->integer('month');

        $query = StaffProfile::where('employment_status', 'active');

        if ($request->filled('staff_profile_ids')) {
            $query->whereIn('id', $request->input('staff_profile_ids'));
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }

        $staffProfiles = $query->get();

        DB::beginTransaction();

        try {
            $generatedPayrolls = [];

            foreach ($staffProfiles as $staffProfile) {
                $existingPayroll = PayrollRecord::where('staff_profile_id', $staffProfile->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->first();

                if ($existingPayroll !== null) {
                    continue;
                }

                $calculatedData = $this->payrollService->calculatePayroll($staffProfile, $year, $month);

                $payroll = PayrollRecord::create([
                    'staff_profile_id' => $staffProfile->id,
                    'year' => $year,
                    'month' => $month,
                    ...$calculatedData,
                ]);

                $generatedPayrolls[] = $payroll;
            }

            DB::commit();

            return response([
                'data' => PayrollRecordResource::collection($generatedPayrolls),
                'message' => 'Payroll generated successfully',
                'count' => count($generatedPayrolls),
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(string $id): Response
    {
        $payrollRecord = PayrollRecord::with(['staffProfile.user', 'staffProfile.department', 'approvedBy'])
            ->findOrFail($id);

        return response([
            'data' => new PayrollRecordResource($payrollRecord),
        ], Response::HTTP_OK);
    }

    public function approve(Request $request, string $id): Response
    {
        $payrollRecord = PayrollRecord::findOrFail($id);

        $payrollRecord->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response([
            'data' => new PayrollRecordResource($payrollRecord->fresh(['staffProfile.user', 'staffProfile.department'])),
        ], Response::HTTP_OK);
    }

    public function markAsPaid(Request $request, string $id): Response
    {
        $validated = $request->validate([
            'payment_date' => ['required', 'date'],
        ]);

        $payrollRecord = PayrollRecord::findOrFail($id);

        $payrollRecord->update([
            'status' => 'paid',
            'payment_date' => $validated['payment_date'],
        ]);

        return response([
            'data' => new PayrollRecordResource($payrollRecord->fresh(['staffProfile.user', 'staffProfile.department'])),
        ], Response::HTTP_OK);
    }

    public function destroy(string $id): Response
    {
        $payrollRecord = PayrollRecord::findOrFail($id);

        if ($payrollRecord->status === 'paid') {
            return response([
                'message' => 'Cannot delete a paid payroll record',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $payrollRecord->delete();

        return response()->noContent();
    }

    public function calculatePreview(Request $request): Response
    {
        $validated = $request->validate([
            'staff_profile_id' => ['required', 'exists:staff_profiles,id'],
            'year' => ['required', 'integer'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        $staffProfile = StaffProfile::findOrFail($validated['staff_profile_id']);
        $calculatedData = $this->payrollService->calculatePayroll(
            $staffProfile,
            $validated['year'],
            $validated['month']
        );

        return response([
            'data' => $calculatedData,
        ], Response::HTTP_OK);
    }
}
