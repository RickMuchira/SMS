<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\StudentTransport;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LocationController extends Controller
{
    /**
     * Store or update a student's pickup / dropoff location.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'student_id' => ['required', 'exists:users,id'],
            'bus_id' => ['nullable', 'exists:buses,id'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'location_type' => ['required', 'in:pickup,dropoff,both'],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        $uniqueKey = [
            'student_id' => $validated['student_id'],
            'location_type' => $validated['location_type'],
            'bus_id' => $validated['bus_id'] ?? null,
        ];

        $location = Location::updateOrCreate(
            $uniqueKey,
            [
                'name' => $validated['address'] ?? 'Student location',
                'description' => null,
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'address' => $validated['address'] ?? null,
                'bus_id' => $validated['bus_id'] ?? null,
                'order_sequence' => 0,
                'created_by' => $user?->id,
                'is_verified' => false,
            ],
        );

        // Ensure a StudentTransport record exists and attach location.
        $transport = StudentTransport::firstOrCreate(
            ['student_id' => $validated['student_id']],
            [
                'uses_transport' => true,
                'morning_trip_id' => null,
                'evening_trip_id' => null,
                'pickup_location_id' => null,
                'dropoff_location_id' => null,
            ],
        );

        if (in_array($validated['location_type'], ['pickup', 'both'], true)) {
            $transport->pickup_location_id = $location->id;
        }

        if (in_array($validated['location_type'], ['dropoff', 'both'], true)) {
            $transport->dropoff_location_id = $location->id;
        }

        $transport->uses_transport = true;
        $transport->save();

        return response([
            'location' => $location,
            'transport' => $transport,
        ], Response::HTTP_OK);
    }
}
