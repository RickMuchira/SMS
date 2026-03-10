<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusController extends Controller
{
    public function index(): JsonResponse
    {
        $buses = Bus::query()
            ->withCount('trips')
            ->orderBy('registration_number')
            ->get();

        return response()->json(['data' => $buses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => ['required', 'string', 'max:255', 'unique:buses'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'status' => ['required', Rule::in(['active', 'inactive', 'maintenance'])],
            'notes' => ['nullable', 'string'],
        ]);

        $bus = Bus::create($validated);

        return response()->json(['bus' => $bus], 201);
    }

    public function show(Bus $bus): JsonResponse
    {
        $bus->load(['trips' => function ($query) {
            $query->orderBy('trip_date', 'desc')->limit(10);
        }]);

        return response()->json(['bus' => $bus]);
    }

    public function update(Request $request, Bus $bus): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => ['required', 'string', 'max:255', Rule::unique('buses')->ignore($bus->id)],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'status' => ['required', Rule::in(['active', 'inactive', 'maintenance'])],
            'notes' => ['nullable', 'string'],
        ]);

        $bus->update($validated);

        return response()->json(['bus' => $bus]);
    }

    public function destroy(Bus $bus): JsonResponse
    {
        $bus->delete();

        return response()->json(['message' => 'Bus deleted successfully']);
    }
}
