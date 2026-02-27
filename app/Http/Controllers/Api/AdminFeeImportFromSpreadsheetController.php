<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Services\FeeImportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminFeeImportFromSpreadsheetController extends Controller
{
    /**
     * Process fee import from spreadsheet UI (JSON payload).
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'class_fees' => ['nullable', 'array'],
            'class_fees.*' => ['array'],
            'class_fees.*.0' => ['nullable', 'string'],
            'class_fees.*.1' => ['nullable', 'string'],
            'transport_fees' => ['nullable', 'array'],
            'transport_fees.*' => ['array'],
            'activities' => ['nullable', 'array'],
            'activities.*' => ['array'],
            'student_activities' => ['nullable', 'array'],
            'student_activities.*' => ['array'],
            'debit_credit' => ['nullable', 'array'],
            'debit_credit.*' => ['array'],
            'amount_paid' => ['nullable', 'array'],
            'amount_paid.*' => ['array'],
        ]);

        /** @var \App\Models\AcademicTerm $term */
        $term = AcademicTerm::findOrFail($validated['term_id']);

        $classFeesRows = array_values(array_filter($validated['class_fees'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== ''));
        $transportFeesRows = array_values(array_filter($validated['transport_fees'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== '' && trim((string) ($r[2] ?? '')) !== ''));
        $activitiesRows = array_values(array_filter($validated['activities'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== ''));
        $studentActivitiesRows = array_values(array_filter($validated['student_activities'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== ''));

        $activityNames = array_map(fn ($r) => trim((string) ($r[0] ?? '')), $activitiesRows);

        $debitCreditRows = array_values(array_filter($validated['debit_credit'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== ''));
        $amountPaidRows = array_values(array_filter($validated['amount_paid'] ?? [], fn ($r) => trim((string) ($r[0] ?? '')) !== '' && trim((string) ($r[1] ?? '')) !== ''));

        $sheets = [
            array_merge([['Class Name', 'Base Fee']], $classFeesRows),
            array_merge([['Student Name', 'Class', 'Transport Fee', 'Student Email']], $transportFeesRows),
            array_merge([['Activity Name', 'Price']], $activitiesRows),
            array_merge(
                [array_merge(['Student Name', 'Class'], $activityNames)],
                array_map(function ($row) use ($activityNames) {
                    $base = [trim((string) ($row[0] ?? '')), trim((string) ($row[1] ?? ''))];
                    $rest = [];
                    for ($i = 0; $i < count($activityNames); $i++) {
                        $rest[] = trim((string) ($row[2 + $i] ?? ''));
                    }

                    return array_merge($base, $rest);
                }, $studentActivitiesRows),
            ),
            array_merge([['Student Name', 'Class', 'Debit Balance', 'Credit Balance']], $debitCreditRows),
            array_merge([['Student Name', 'Class', 'Amount Paid']], $amountPaidRows),
        ];

        try {
            $result = FeeImportService::process($term, $sheets);
        } catch (\Throwable $e) {
            return response([
                'message' => 'Failed to import fees.',
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response($result, Response::HTTP_OK);
    }
}
