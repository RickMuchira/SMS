<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherClassAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TeacherClassAssignmentController extends Controller
{
    /**
     * List assignments: by teacher_id or by school_class_id.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TeacherClassAssignment::with(['user', 'schoolClass', 'subject']);

        if ($request->filled('teacher_id')) {
            $query->where('user_id', $request->integer('teacher_id'));
        }

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->integer('school_class_id'));
        }

        $assignments = $query->orderBy('school_class_id')->get();

        return response()->json(['data' => $assignments]);
    }

    /**
     * Store a new assignment.
     */
    public function store(Request $request): JsonResponse|Response
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'role' => ['required', 'string', 'in:class_teacher,subject_teacher,full_teacher'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
        ]);

        $assignment = TeacherClassAssignment::create($validated);

        return response()->json($assignment->load(['user', 'schoolClass', 'subject']), 201);
    }

    /**
     * Remove an assignment.
     */
    public function destroy(TeacherClassAssignment $teacherClassAssignment): Response
    {
        $teacherClassAssignment->delete();

        return response()->noContent();
    }
}
