<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExtracurricularActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeeActivityController extends Controller
{
    public function index(): Response
    {
        $activities = ExtracurricularActivity::query()
            ->orderBy('name')
            ->get();

        return response($activities, Response::HTTP_OK);
    }

    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:extracurricular_activities,name'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $activity = ExtracurricularActivity::create([
            'name' => $validated['name'],
            'price' => $validated['price'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response($activity, Response::HTTP_CREATED);
    }

    public function update(Request $request, string $id): Response
    {
        $activity = ExtracurricularActivity::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:extracurricular_activities,name,'.$id],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $activity->update($validated);

        return response($activity->fresh(), Response::HTTP_OK);
    }

    public function destroy(string $id): Response
    {
        $activity = ExtracurricularActivity::findOrFail($id);
        $activity->delete();

        return response()->noContent();
    }
}
