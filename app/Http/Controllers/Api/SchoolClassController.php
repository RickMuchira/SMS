<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class SchoolClassController extends Controller
{
    /**
     * Display a listing of classes.
     */
    public function index(Request $request): Response
    {
        $classes = SchoolClass::query()
            ->withCount('students')
            ->orderBy('name')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where('name', 'like', "%{$search}%");
            })
            ->paginate($request->integer('per_page', 50));

        return response($classes, Response::HTTP_OK);
    }

    /**
     * Store a newly created class.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:school_classes,name'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $class = SchoolClass::create($validated);

        Log::info('SchoolClass created via API', [
            'id' => $class->id,
            'name' => $class->name,
            'user_id' => $request->user()?->id,
            'user_email' => $request->user()?->email,
        ]);

        return response(['class' => $class], Response::HTTP_CREATED);
    }

    /**
     * Display the specified class.
     */
    public function show(SchoolClass $class): Response
    {
        $class->loadCount('students');

        return response(['class' => $class], Response::HTTP_OK);
    }

    /**
     * Update the specified class.
     */
    public function update(Request $request, SchoolClass $class): Response
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:school_classes,name,'.$class->id],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $class->update($validated);

        Log::info('SchoolClass updated via API', [
            'id' => $class->id,
            'validated' => $validated,
            'user_id' => $request->user()?->id,
            'user_email' => $request->user()?->email,
        ]);

        return response(['class' => $class->fresh()], Response::HTTP_OK);
    }

    /**
     * Remove the specified class.
     */
    public function destroy(SchoolClass $class): Response
    {
        $class->delete();

        return response()->noContent();
    }
}
