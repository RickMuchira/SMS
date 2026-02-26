<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TeachersController extends Controller
{
    public function index(Request $request): InertiaResponse|Response
    {
        return Inertia::render('admin/teachers/index');
    }
}
