<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use App\Services\ResultImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ResultImportController extends Controller
{
    public function __construct(
        protected ResultImportService $resultImport
    ) {}

    /**
     * Preview result import: parse rows, match students, report unmatched/missing.
     */
    public function preview(Request $request): JsonResponse|Response
    {
        $validated = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'academic_term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'rows' => ['required', 'array'],
            'rows.*' => ['array'],
        ]);

        $schoolClass = SchoolClass::findOrFail($validated['school_class_id']);
        $term = AcademicTerm::findOrFail($validated['academic_term_id']);

        $preview = $this->resultImport->preview($schoolClass, $term, $validated['rows']);

        return response()->json($preview);
    }

    /**
     * Import results using confirmed matches.
     */
    public function import(Request $request): JsonResponse|Response
    {
        $validated = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'academic_term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'rows' => ['required', 'array'],
            'rows.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'rows.*.scores' => ['required', 'array'],
        ]);

        $schoolClass = SchoolClass::findOrFail($validated['school_class_id']);
        $term = AcademicTerm::findOrFail($validated['academic_term_id']);

        $result = $this->resultImport->import($schoolClass, $term, $validated['rows']);

        return response()->json($result);
    }
}
