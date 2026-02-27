<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class FeeController extends Controller
{
    public function index(): InertiaResponse|Response
    {
        $terms = AcademicTerm::query()
            ->orderByDesc('is_active')
            ->orderByDesc('academic_year')
            ->orderBy('term_number')
            ->get(['id', 'name', 'term_number', 'academic_year', 'is_active']);

        $classes = \App\Models\SchoolClass::query()
            ->orderBy('name')
            ->get(['id', 'name', 'base_fee', 'uniform_fee']);

        $activities = \App\Models\ExtracurricularActivity::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'price']);

        return Inertia::render('admin/fees/index', [
            'terms' => $terms,
            'classes' => $classes,
            'activities' => $activities,
        ]);
    }
}
