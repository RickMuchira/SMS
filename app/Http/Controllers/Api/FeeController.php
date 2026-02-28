<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentFee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $fees = StudentFee::with(['feeStructure', 'payments', 'academicTerm'])
            ->where('user_id', $user->id)
            ->orderBy('due_date', 'asc')
            ->get()
            ->map(function ($fee) {
                return [
                    'id' => $fee->id,
                    'amount' => $fee->amount,
                    'amount_paid' => $fee->amount_paid,
                    'balance' => $fee->balance,
                    'status' => $fee->status,
                    'due_date' => $fee->due_date?->format('Y-m-d'),
                    'term' => $fee->academicTerm?->name,
                    'academic_year' => $fee->academicTerm?->academic_year,
                    'fee_structure' => $fee->feeStructure,
                ];
            });

        $summary = [
            'total_fees' => $user->total_fees,
            'total_paid' => $user->total_paid,
            'total_balance' => $user->total_balance,
        ];

        return response()->json([
            'fees' => $fees,
            'summary' => $summary,
        ]);
    }

    public function show(Request $request, StudentFee $studentFee): JsonResponse
    {
        $user = $request->user();

        if ($studentFee->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $studentFee->load(['feeStructure', 'payments.recordedBy']);

        return response()->json(['fee' => $studentFee]);
    }
}
