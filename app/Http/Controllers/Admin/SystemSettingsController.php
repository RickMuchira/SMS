<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SystemSettingsController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $settings = [
            'app_name' => SystemSetting::get('app_name', config('app.name')),
            'app_logo' => SystemSetting::get('app_logo', '/logo.svg'),
            'email_domain' => SystemSetting::get('email_domain', 'student.local'),
            'email_format' => SystemSetting::get('email_format', '{firstname}.{lastname}'),
            'school_latitude' => SystemSetting::get('school_latitude'),
            'school_longitude' => SystemSetting::get('school_longitude'),
            'school_address' => SystemSetting::get('school_address'),
        ];

        return Inertia::render('admin/settings/index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'app_name' => ['sometimes', 'string', 'max:255'],
            'app_logo' => ['sometimes', 'string', 'max:1000'],
            'email_domain' => ['sometimes', 'string', 'max:255'],
            'email_format' => ['sometimes', 'string', 'max:255'],
            'school_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'school_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'school_address' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::set($key, $value);
        }

        return redirect()->back()->with('success', 'Settings updated successfully');
    }
}
