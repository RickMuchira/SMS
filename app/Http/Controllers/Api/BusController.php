<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BusController extends Controller
{
    public function index(): JsonResponse
    {
        $buses = Bus::query()
            ->with(['driver:id,name', 'assistant:id,name'])
            ->withCount('trips')
            ->orderBy('registration_number')
            ->get();

        return response()->json(['data' => $buses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => ['required', 'string', 'max:255', 'unique:buses'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'maintenance'])],
            'notes' => ['nullable', 'string'],
            'driver_id' => ['nullable', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
        ]);

        $bus = Bus::create([
            'registration_number' => $validated['registration_number'],
            'capacity' => $validated['capacity'] ?? 30,
            'status' => $validated['status'] ?? 'active',
            'notes' => $validated['notes'] ?? null,
            'driver_id' => $validated['driver_id'] ?? null,
            'assistant_id' => $validated['assistant_id'] ?? null,
        ]);

        return response()->json(['bus' => $bus], 201);
    }

    public function show(Bus $bus): JsonResponse
    {
        $bus->load([
            'driver:id,name',
            'assistant:id,name',
            'trips' => static function ($query): void {
                $query->orderBy('trip_date', 'desc')->limit(10);
            },
        ]);

        return response()->json(['bus' => $bus]);
    }

    public function update(Request $request, Bus $bus): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => ['sometimes', 'string', 'max:255', Rule::unique('buses')->ignore($bus->id)],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'maintenance'])],
            'notes' => ['nullable', 'string'],
            'driver_id' => ['nullable', 'exists:users,id'],
            'assistant_id' => ['nullable', 'exists:users,id'],
        ]);

        $bus->update($validated);

        return response()->json(['bus' => $bus]);
    }

    public function destroy(Bus $bus): JsonResponse
    {
        $bus->delete();

        return response()->json(['message' => 'Bus deleted successfully']);
    }

    public function staffPresets(Bus $bus): JsonResponse
    {
        $presets = $bus->staffPresets()
            ->with(['driver:id,name', 'assistant:id,name'])
            ->orderBy('type')
            ->orderBy('trip_number')
            ->get();

        return response()->json(['data' => $presets]);
    }

    public function updateStaffPresets(Request $request, Bus $bus): JsonResponse
    {
        $data = $request->validate([
            'presets' => ['array'],
            'presets.*.type' => ['required', Rule::in(['morning', 'evening'])],
            'presets.*.trip_number' => ['required', 'integer', 'min:1'],
            'presets.*.driver_id' => ['nullable', 'exists:users,id'],
            'presets.*.assistant_id' => ['nullable', 'exists:users,id'],
        ]);

        $presets = $data['presets'] ?? [];

        DB::transaction(static function () use ($bus, $presets): void {
            $bus->staffPresets()->delete();

            foreach ($presets as $preset) {
                $bus->staffPresets()->create([
                    'type' => $preset['type'],
                    'trip_number' => $preset['trip_number'],
                    'driver_id' => $preset['driver_id'] ?? null,
                    'assistant_id' => $preset['assistant_id'] ?? null,
                ]);
            }
        });

        return $this->staffPresets($bus);
    }

    public function staffPresetsSummary(): JsonResponse
    {
        $buses = Bus::query()
            ->with([
                'staffPresets.driver:id,name',
                'staffPresets.assistant:id,name',
            ])
            ->orderBy('registration_number')
            ->get();

        $maxMorning = 0;
        $maxEvening = 0;

        foreach ($buses as $bus) {
            $morningMax = (int) ($bus->staffPresets
                ->where('type', 'morning')
                ->max('trip_number') ?? 0);
            $eveningMax = (int) ($bus->staffPresets
                ->where('type', 'evening')
                ->max('trip_number') ?? 0);

            $maxMorning = max($maxMorning, $morningMax);
            $maxEvening = max($maxEvening, $eveningMax);
        }

        $summary = $buses->map(static function (Bus $bus) {
            return [
                'id' => $bus->id,
                'registration_number' => $bus->registration_number,
                'staff_presets' => $bus->staffPresets->map(static function ($preset) {
                    return [
                        'type' => $preset->type,
                        'trip_number' => $preset->trip_number,
                        'driver' => $preset->driver ? [
                            'id' => $preset->driver->id,
                            'name' => $preset->driver->name,
                        ] : null,
                        'assistant' => $preset->assistant ? [
                            'id' => $preset->assistant->id,
                            'name' => $preset->assistant->name,
                        ] : null,
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'buses' => $summary,
            'max_morning_trip' => $maxMorning,
            'max_evening_trip' => $maxEvening,
        ]);
    }
}
