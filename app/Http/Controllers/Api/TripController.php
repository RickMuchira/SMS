<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TripController extends Controller
{
    /**
     * Display a listing of trips.
     */
    public function index(Request $request): Response
    {
        $trips = Trip::query()
            ->with(['driver', 'assistant'])
            ->orderBy('type')
            ->orderBy('trip_number')
            ->paginate($request->integer('per_page', 50));

        return response($trips, Response::HTTP_OK);
    }

    /**
     * Store a newly created trip.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:morning,evening'],
            'trip_number' => ['required', 'integer', 'min:1'],
            'driver_id' => ['required', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
            'departure_time' => ['nullable', 'date_format:H:i'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $trip = Trip::create($validated);

        return response(['trip' => $trip->fresh(['driver', 'assistant'])], Response::HTTP_CREATED);
    }

    /**
     * Display the specified trip.
     */
    public function show(Trip $trip): Response
    {
        $trip->load(['driver', 'assistant']);

        return response(['trip' => $trip], Response::HTTP_OK);
    }

    /**
     * Update the specified trip.
     */
    public function update(Request $request, Trip $trip): Response
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:morning,evening'],
            'trip_number' => ['sometimes', 'integer', 'min:1'],
            'driver_id' => ['sometimes', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
            'departure_time' => ['nullable', 'date_format:H:i'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $trip->update($validated);

        return response(['trip' => $trip->fresh(['driver', 'assistant'])], Response::HTTP_OK);
    }

    /**
     * Remove the specified trip.
     */
    public function destroy(Trip $trip): Response
    {
        $trip->delete();

        return response()->noContent();
    }
}
