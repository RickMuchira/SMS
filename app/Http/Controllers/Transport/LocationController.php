<?php

namespace App\Http\Controllers\Transport;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class LocationController extends Controller
{
    /**
     * Show the location marking page for drivers / assistants / admins.
     */
    public function index(): InertiaResponse
    {
        $students = User::role('student')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('transport/mark-location', [
            'students' => $students,
        ]);
    }
}
