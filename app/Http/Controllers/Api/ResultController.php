<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResultController extends Controller
{
    /**
     * Get results for the authenticated student (used by mobile/parent).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $termId = $request->integer('academic_term_id');

        $query = $user->academicResults()
            ->with(['subject', 'academicTerm', 'schoolClass']);

        if ($termId > 0) {
            $query->where('academic_term_id', $termId);
        } else {
            // Default: active term
            $activeTerm = AcademicTerm::where('is_active', true)->first();
            if ($activeTerm) {
                $query->where('academic_term_id', $activeTerm->id);
                $termId = $activeTerm->id;
            }
        }

        $results = $query->orderBy('subject_id')->get();

        // Calculate position if we have results
        $position = null;
        $totalStudents = null;
        $classAverage = null;

        if ($results->isNotEmpty()) {
            $firstResult = $results->first();
            $classId = $firstResult->school_class_id;
            $currentTermId = $termId;

            // Get all students' results for this class and term
            $allResults = \App\Models\AcademicResult::where('school_class_id', $classId)
                ->where('academic_term_id', $currentTermId)
                ->get();

            // Group by student and calculate totals
            $studentTotals = [];
            foreach ($allResults as $result) {
                $userId = $result->user_id;
                if (! isset($studentTotals[$userId])) {
                    $studentTotals[$userId] = 0;
                }
                if (is_numeric($result->score)) {
                    $studentTotals[$userId] += (float) $result->score;
                }
            }

            // Sort by total score descending
            arsort($studentTotals);
            $rankedStudents = array_keys($studentTotals);
            $position = array_search($user->id, $rankedStudents, true);
            if ($position !== false) {
                $position = $position + 1;
            }
            $totalStudents = count($studentTotals);
            $classAverage = count($studentTotals) > 0 ? round(array_sum($studentTotals) / count($studentTotals), 1) : 0;
        }

        $terms = AcademicTerm::orderBy('academic_year', 'desc')
            ->orderBy('term_number', 'desc')
            ->limit(6)
            ->get(['id', 'name', 'term_number', 'academic_year', 'is_active']);

        // Calculate student's total and average
        $total = 0;
        $count = 0;
        foreach ($results as $result) {
            if (is_numeric($result->score)) {
                $total += (float) $result->score;
                $count++;
            }
        }
        $average = $count > 0 ? round($total / $count, 1) : 0;

        return response()->json([
            'results' => $results,
            'terms' => $terms,
            'analytics' => [
                'position' => $position,
                'total_students' => $totalStudents,
                'total_score' => $total,
                'average' => $average,
                'class_average' => $classAverage,
            ],
        ]);
    }
}
