<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TripController extends Controller
{
    /**
     * Display the trip management page.
     */
    public function __invoke(Request $request): InertiaResponse
    {
        return Inertia::render('admin/transport/trips');
    }
}
