<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicResult;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResultAnalyticsController extends Controller
{
    /**
     * Get all results for a class in a term with analytics.
     */
    public function classResults(Request $request, int $classId, int $termId): JsonResponse
    {
        $class = SchoolClass::with('students')->findOrFail($classId);
        $term = AcademicTerm::findOrFail($termId);

        // Get all results for this class and term
        $results = AcademicResult::where('school_class_id', $classId)
            ->where('academic_term_id', $termId)
            ->with(['user', 'subject'])
            ->get();

        // Group by student
        $studentResults = [];
        foreach ($results as $result) {
            $userId = $result->user_id;
            if (! isset($studentResults[$userId])) {
                $studentResults[$userId] = [
                    'user_id' => $userId,
                    'name' => $result->user->name ?? '',
                    'email' => $result->user->email ?? null,
                    'subjects' => [],
                    'total' => 0,
                    'count' => 0,
                ];
            }
            $score = is_numeric($result->score) ? (float) $result->score : 0;
            $studentResults[$userId]['subjects'][$result->subject->code] = [
                'name' => $result->subject->name,
                'score' => $result->score,
                'max_score' => $result->max_score,
                'grade' => $result->grade,
            ];
            $studentResults[$userId]['total'] += $score;
            $studentResults[$userId]['count']++;
        }

        // Calculate average and add position
        foreach ($studentResults as $userId => &$data) {
            $data['average'] = $data['count'] > 0 ? round($data['total'] / $data['count'], 2) : 0;
        }

        // Sort by total (descending) and assign positions
        usort($studentResults, fn ($a, $b) => $b['total'] <=> $a['total']);
        foreach ($studentResults as $index => &$data) {
            $data['position'] = $index + 1;
        }

        // Class analytics
        $analytics = [
            'total_students' => count($studentResults),
            'class_average' => count($studentResults) > 0 ? round(array_sum(array_column($studentResults, 'average')), 2) : 0,
            'highest_score' => $studentResults[0]['total'] ?? 0,
            'lowest_score' => end($studentResults)['total'] ?? 0,
            'subject_averages' => [],
        ];

        // Subject-wise averages
        $subjectScores = [];
        foreach ($results as $result) {
            $code = $result->subject->code;
            if (! isset($subjectScores[$code])) {
                $subjectScores[$code] = ['name' => $result->subject->name, 'scores' => []];
            }
            if (is_numeric($result->score)) {
                $subjectScores[$code]['scores'][] = (float) $result->score;
            }
        }

        foreach ($subjectScores as $code => $data) {
            $analytics['subject_averages'][] = [
                'subject' => $data['name'],
                'average' => count($data['scores']) > 0 ? round(array_sum($data['scores']) / count($data['scores']), 2) : 0,
                'count' => count($data['scores']),
            ];
        }

        // Anomaly detection
        $anomalies = [];

        // 1. Students with no email
        foreach ($studentResults as $s) {
            if (empty($s['email'])) {
                $anomalies[] = "No email on record for student: {$s['name']}";
            }
        }

        // 2. Duplicate emails among results
        $emails = array_filter(array_column($studentResults, 'email'));
        $duplicateEmails = array_keys(array_filter(array_count_values($emails), fn ($c) => $c > 1));
        foreach ($duplicateEmails as $dup) {
            $names = array_column(array_filter($studentResults, fn ($s) => $s['email'] === $dup), 'name');
            $anomalies[] = "Duplicate email ({$dup}) shared by: ".implode(', ', $names);
        }

        // 3. Students in this class missing from results
        $classStudents = $class->students()
            ->pluck('name', 'id')
            ->toArray();

        $resultStudentIds = array_column($studentResults, 'user_id');
        foreach ($classStudents as $uid => $uname) {
            if (! in_array($uid, $resultStudentIds, true)) {
                $anomalies[] = "Student in class has no results this term: {$uname}";
            }
        }

        return response()->json([
            'class' => [
                'id' => $class->id,
                'name' => $class->name,
                'grade_code' => $class->grade_code,
            ],
            'term' => [
                'id' => $term->id,
                'name' => $term->name,
                'academic_year' => $term->academic_year,
            ],
            'students' => array_values($studentResults),
            'analytics' => $analytics,
            'anomalies' => $anomalies,
        ]);
    }

    /**
     * Get all results for a student across terms.
     */
    public function studentResults(Request $request, int $studentId): JsonResponse
    {
        $results = AcademicResult::where('user_id', $studentId)
            ->with(['subject', 'academicTerm', 'schoolClass'])
            ->orderBy('academic_term_id', 'desc')
            ->get();

        $grouped = [];
        foreach ($results as $result) {
            $termId = $result->academic_term_id;
            if (! isset($grouped[$termId])) {
                $grouped[$termId] = [
                    'term' => [
                        'id' => $result->academicTerm->id,
                        'name' => $result->academicTerm->name,
                        'academic_year' => $result->academicTerm->academic_year,
                    ],
                    'class' => $result->schoolClass?->name ?? '',
                    'subjects' => [],
                    'total' => 0,
                    'count' => 0,
                ];
            }
            $score = is_numeric($result->score) ? (float) $result->score : 0;
            $grouped[$termId]['subjects'][] = [
                'name' => $result->subject->name,
                'score' => $result->score,
                'max_score' => $result->max_score,
                'grade' => $result->grade,
            ];
            $grouped[$termId]['total'] += $score;
            $grouped[$termId]['count']++;
        }

        foreach ($grouped as &$data) {
            $data['average'] = $data['count'] > 0 ? round($data['total'] / $data['count'], 2) : 0;
        }

        return response()->json([
            'student_id' => $studentId,
            'terms' => array_values($grouped),
        ]);
    }
}
