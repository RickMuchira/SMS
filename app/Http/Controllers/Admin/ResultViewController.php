<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ResultViewController extends Controller
{
    public function index(): InertiaResponse|Response
    {
        $terms = AcademicTerm::query()
            ->orderByDesc('is_active')
            ->orderByDesc('academic_year')
            ->orderBy('term_number')
            ->get(['id', 'name', 'term_number', 'academic_year', 'is_active']);

        $classes = SchoolClass::query()
            ->orderBy('name')
            ->get(['id', 'name', 'grade_code']);

        return Inertia::render('admin/results/view', [
            'terms' => $terms,
            'classes' => $classes,
        ]);
    }
}
