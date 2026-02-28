<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicResult;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResultUpdateController extends Controller
{
    /**
     * Update a single result.
     */
    public function update(Request $request, int $resultId): JsonResponse
    {
        $validated = $request->validate([
            'score' => 'nullable|string|max:10',
            'max_score' => 'nullable|string|max:10',
            'grade' => 'nullable|string|max:5',
            'remarks' => 'nullable|string|max:255',
        ]);

        $result = AcademicResult::findOrFail($resultId);
        $result->update($validated);

        return response()->json([
            'message' => 'Result updated successfully',
            'result' => $result->load(['subject', 'user']),
        ]);
    }

    /**
     * Update multiple results in bulk.
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_class_id' => 'required|exists:school_classes,id',
            'academic_term_id' => 'required|exists:academic_terms,id',
            'results' => 'required|array',
            'results.*.user_id' => 'required|exists:users,id',
            'results.*.subject_code' => 'required|string',
            'results.*.score' => 'nullable|string|max:10',
        ]);

        $subjectCodes = collect($validated['results'])->pluck('subject_code')->unique()->all();
        $subjects = Subject::whereIn('code', $subjectCodes)->get()->keyBy('code');

        DB::beginTransaction();
        try {
            $updatedCount = 0;

            foreach ($validated['results'] as $resultData) {
                $subject = $subjects->get($resultData['subject_code']);
                if (! $subject) {
                    continue;
                }

                AcademicResult::updateOrCreate(
                    [
                        'user_id' => $resultData['user_id'],
                        'academic_term_id' => $validated['academic_term_id'],
                        'subject_id' => $subject->id,
                        'school_class_id' => $validated['school_class_id'],
                    ],
                    [
                        'score' => $resultData['score'],
                    ]
                );

                $updatedCount++;
            }
            DB::commit();

            return response()->json([
                'message' => 'Results updated successfully',
                'updated_count' => $updatedCount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to update results',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a single result.
     */
    public function destroy(int $resultId): JsonResponse
    {
        $result = AcademicResult::findOrFail($resultId);
        $result->delete();

        return response()->json([
            'message' => 'Result deleted successfully',
        ]);
    }

    /**
     * Delete all results for a class and term.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_class_id' => 'required|exists:school_classes,id',
            'academic_term_id' => 'required|exists:academic_terms,id',
        ]);

        $deleted = AcademicResult::where('school_class_id', $validated['school_class_id'])
            ->where('academic_term_id', $validated['academic_term_id'])
            ->delete();

        return response()->json([
            'message' => 'Results deleted successfully',
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Delete all results for a single student in a class and term.
     */
    public function destroyStudent(Request $request, int $studentId): JsonResponse
    {
        $validated = $request->validate([
            'school_class_id' => 'required|exists:school_classes,id',
            'academic_term_id' => 'required|exists:academic_terms,id',
        ]);

        $deleted = AcademicResult::where('user_id', $studentId)
            ->where('school_class_id', $validated['school_class_id'])
            ->where('academic_term_id', $validated['academic_term_id'])
            ->delete();

        return response()->json([
            'message' => 'Student results deleted successfully',
            'deleted_count' => $deleted,
        ]);
    }
}
