<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use Inertia\Inertia;
use Inertia\Response;

class FeeClassController extends Controller
{
    public function index(): Response
    {
        $classes = SchoolClass::query()
            ->orderBy('name')
            ->get(['id', 'name', 'base_fee', 'description']);

        return Inertia::render('admin/fees/classes', [
            'classes' => $classes,
        ]);
    }
}
