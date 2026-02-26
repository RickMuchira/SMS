<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SchoolClassController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('admin/classes/index');
    }
}
