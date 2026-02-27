<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Services\FeeImportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;

class AdminFeeImportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:4096'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        /** @var \App\Models\AcademicTerm $term */
        $term = AcademicTerm::findOrFail($validated['term_id']);

        $sheets = Excel::toArray(null, $file);

        if (empty($sheets)) {
            return response([
                'message' => 'Excel file is empty or invalid.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

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
