<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class SystemSettingController extends Controller
{
    /**
     * Get system settings (public for branding).
     */
    public function index(): Response
    {
        $settings = [
            'email_domain' => SystemSetting::get('email_domain', 'student.local'),
            'email_format' => SystemSetting::get('email_format', '{firstname}.{lastname}'),
            'app_name' => SystemSetting::get('app_name', 'School Management'),
            'app_logo' => SystemSetting::get('app_logo', null),
            'school_latitude' => SystemSetting::get('school_latitude'),
            'school_longitude' => SystemSetting::get('school_longitude'),
            'school_address' => SystemSetting::get('school_address'),
        ];

        return response($settings, Response::HTTP_OK);
    }

    /**
     * Update system settings (super-admin only).
     */
    public function update(Request $request): Response
    {
        $validated = $request->validate([
            'email_domain' => ['nullable', 'string', 'max:255'],
            'email_format' => ['nullable', 'string', 'max:255'],
            'app_name' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', 'file', 'image', 'max:2048'],
            'school_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'school_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'school_address' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($validated['email_domain'])) {
            SystemSetting::set('email_domain', $validated['email_domain']);
        }

        if (isset($validated['email_format'])) {
            SystemSetting::set('email_format', $validated['email_format']);
        }

        if (isset($validated['app_name'])) {
            SystemSetting::set('app_name', $validated['app_name']);
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            SystemSetting::set('app_logo', $path);
        }

        return $this->index();
    }

    /**
     * Remove logo.
     */
    public function deleteLogo(): Response
    {
        $logoPath = SystemSetting::get('app_logo');
        if ($logoPath && Storage::disk('public')->exists($logoPath)) {
            Storage::disk('public')->delete($logoPath);
        }
        SystemSetting::set('app_logo', null);

        return response()->noContent();
    }
}
