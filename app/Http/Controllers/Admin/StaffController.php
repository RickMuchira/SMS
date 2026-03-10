<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class StaffController extends Controller
{
    public function index(): InertiaResponse|Response
    {
        return Inertia::render('admin/staff/profiles');
    }
}
