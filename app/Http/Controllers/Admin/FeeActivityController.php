<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExtracurricularActivity;
use Inertia\Inertia;
use Inertia\Response;

class FeeActivityController extends Controller
{
    public function index(): Response
    {
        $activities = ExtracurricularActivity::query()
            ->orderBy('name')
            ->get(['id', 'name', 'price', 'is_active']);

        return Inertia::render('admin/fees/activities', [
            'activities' => $activities,
        ]);
    }
}
