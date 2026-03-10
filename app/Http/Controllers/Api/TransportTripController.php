<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\Trip;
use App\Models\TripStop;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransportTripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Trip::query()
            ->with(['bus', 'driver', 'assistant'])
            ->withCount('stops');

        if ($request->filled('date')) {
            $query->whereDate('trip_date', $request->input('date'));
        }

        if ($request->filled('bus_id')) {
            $query->where('bus_id', $request->input('bus_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $trips = $query->orderBy('trip_date', 'desc')
            ->orderBy('start_time')
            ->paginate(20);

        return response()->json($trips);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bus_id' => ['required', 'exists:buses,id'],
            'type' => ['required', Rule::in(['morning', 'evening'])],
            'trip_date' => ['required', 'date'],
            'driver_id' => ['required', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'stops' => ['required', 'array', 'min:1'],
            'stops.*.student_id' => ['required', 'exists:users,id'],
            'stops.*.order_sequence' => ['required', 'integer', 'min:1'],
            'stops.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'stops.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'stops.*.address' => ['nullable', 'string'],
            'stops.*.pickup_notes' => ['nullable', 'string'],
        ]);

        $bus = Bus::findOrFail($validated['bus_id']);

        $trip = DB::transaction(function () use ($validated, $bus) {
            $trip = Trip::create([
                'name' => "{$bus->registration_number} - {$validated['type']} - {$validated['trip_date']}",
                'type' => $validated['type'],
                'trip_number' => 1,
                'bus_id' => $validated['bus_id'],
                'trip_date' => $validated['trip_date'],
                'driver_id' => $validated['driver_id'],
                'assistant_id' => $validated['assistant_id'] ?? null,
                'start_time' => $validated['start_time'] ?? null,
                'status' => 'planned',
            ]);

            foreach ($validated['stops'] as $stopData) {
                TripStop::create([
                    'trip_id' => $trip->id,
                    'student_id' => $stopData['student_id'],
                    'order_sequence' => $stopData['order_sequence'],
                    'latitude' => $stopData['latitude'],
                    'longitude' => $stopData['longitude'],
                    'address' => $stopData['address'] ?? null,
                    'pickup_notes' => $stopData['pickup_notes'] ?? null,
                    'status' => 'pending',
                ]);
            }

            return $trip;
        });

        $trip->load(['bus', 'driver', 'assistant', 'stops.student']);

        return response()->json(['trip' => $trip], 201);
    }

    public function show(Trip $trip): JsonResponse
    {
        $trip->load(['bus', 'driver', 'assistant', 'stops.student']);

        return response()->json(['trip' => $trip]);
    }

    public function update(Request $request, Trip $trip): JsonResponse
    {
        $validated = $request->validate([
            'bus_id' => ['sometimes', 'exists:buses,id'],
            'type' => ['sometimes', Rule::in(['morning', 'evening'])],
            'trip_date' => ['sometimes', 'date'],
            'driver_id' => ['sometimes', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'status' => ['sometimes', Rule::in(['planned', 'in_progress', 'completed', 'cancelled'])],
        ]);

        $trip->update($validated);
        $trip->load(['bus', 'driver', 'assistant', 'stops.student']);

        return response()->json(['trip' => $trip]);
    }

    public function destroy(Trip $trip): JsonResponse
    {
        $trip->delete();

        return response()->json(['message' => 'Trip deleted successfully']);
    }

    public function updateStop(Request $request, Trip $trip, TripStop $stop): JsonResponse
    {
        if ($stop->trip_id !== $trip->id) {
            return response()->json(['message' => 'Stop does not belong to this trip'], 404);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'picked_up', 'dropped_off', 'absent'])],
        ]);

        $stop->update([
            'status' => $validated['status'],
            'status_updated_at' => now(),
        ]);

        $stop->load('student');

        return response()->json(['stop' => $stop]);
    }

    public function todaysTrips(Request $request): JsonResponse
    {
        $user = $request->user();

        $trips = Trip::query()
            ->with(['bus', 'driver', 'assistant', 'stops.student'])
            ->whereDate('trip_date', today())
            ->where(function ($query) use ($user) {
                $query->where('driver_id', $user->id)
                    ->orWhere('assistant_id', $user->id);
            })
            ->orderBy('start_time')
            ->get();

        return response()->json(['trips' => $trips]);
    }

    public function studentsForBus(Request $request, Bus $bus): JsonResponse
    {
        $students = User::query()
            ->whereNotNull('home_latitude')
            ->whereNotNull('home_longitude')
            ->whereHas('roles', function ($query) {
                $query->where('name', 'student');
            })
            ->select('id', 'name', 'home_latitude', 'home_longitude', 'home_address', 'pickup_notes')
            ->orderBy('name')
            ->get();

        return response()->json(['students' => $students]);
    }

    public function unassignedStudents(): JsonResponse
    {
        $students = User::query()
            ->whereNotNull('home_latitude')
            ->whereNotNull('home_longitude')
            ->whereHas('roles', function ($query) {
                $query->where('name', 'student');
            })
            ->whereDoesntHave('assignedBus')
            ->select('id', 'name', 'home_latitude', 'home_longitude', 'home_address', 'pickup_notes')
            ->orderBy('name')
            ->get();

        return response()->json(['students' => $students]);
    }
}
