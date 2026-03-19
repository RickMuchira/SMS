<?php

namespace App\Http\Controllers\Transport;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\SystemSetting;
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
        $students = User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'student'))
            ->orderBy('name')
            ->get(['id', 'name']);

        $buses = Bus::query()
            ->where('status', 'active')
            ->orderBy('registration_number')
            ->get(['id', 'registration_number']);

        return Inertia::render('transport/mark-location', [
            'students' => $students,
            'buses' => $buses,
            'schoolLocation' => [
                'latitude' => $this->toFloat(SystemSetting::get('school_latitude')),
                'longitude' => $this->toFloat(SystemSetting::get('school_longitude')),
                'address' => SystemSetting::get('school_address'),
            ],
        ]);
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
