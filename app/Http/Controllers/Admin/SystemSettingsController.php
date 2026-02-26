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
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::set($key, $value);
        }

        return redirect()->back()->with('success', 'Settings updated successfully');
    }
}
