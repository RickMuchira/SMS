<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicResult;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class StreamComparisonController extends Controller
{
    public function index(): InertiaResponse
    {
        $terms = AcademicTerm::query()
            ->orderByDesc('is_active')
            ->orderByDesc('academic_year')
            ->orderBy('term_number')
            ->get(['id', 'name', 'term_number', 'academic_year', 'is_active']);

        $classes = SchoolClass::query()
            ->orderBy('name')
            ->get(['id', 'name', 'grade_code']);

        // Group classes by grade_code for stream detection
        $streams = [];
        foreach ($classes as $class) {
            if ($class->grade_code) {
                if (! isset($streams[$class->grade_code])) {
                    $streams[$class->grade_code] = [];
                }
                $streams[$class->grade_code][] = [
                    'id' => $class->id,
                    'name' => $class->name,
                ];
            }
        }

        // Filter to only grades with multiple streams
        $streams = array_filter($streams, fn ($s) => count($s) > 1);

        return Inertia::render('admin/results/streams', [
            'terms' => $terms,
            'streams' => $streams,
        ]);
    }

    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'grade_code' => 'required|string',
            'academic_term_id' => 'required|exists:academic_terms,id',
        ]);

        $gradeCode = $validated['grade_code'];
        $termId = $validated['academic_term_id'];

        // Get all classes with this grade_code
        $classes = SchoolClass::where('grade_code', $gradeCode)
            ->orderBy('name')
            ->get();

        if ($classes->isEmpty()) {
            return response()->json(['error' => 'No classes found for this grade'], 404);
        }

        $streamData = [];

        foreach ($classes as $class) {
            // Get results for this class and term
            $results = AcademicResult::where('school_class_id', $class->id)
                ->where('academic_term_id', $termId)
                ->with(['user', 'subject'])
                ->get();

            $total = 0;
            $count = 0;
            $studentCount = $results->groupBy('user_id')->count();

            foreach ($results as $result) {
                if (is_numeric($result->score)) {
                    $total += (float) $result->score;
                    $count++;
                }
            }

            $average = $count > 0 ? round($total / $count, 2) : 0;

            $streamData[] = [
                'class_id' => $class->id,
                'class_name' => $class->name,
                'student_count' => $studentCount,
                'average_score' => $average,
                'total_results' => $count,
            ];
        }

        return response()->json([
            'grade_code' => $gradeCode,
            'term_id' => $termId,
            'streams' => $streamData,
        ]);
    }
}
