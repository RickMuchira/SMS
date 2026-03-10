<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffDepartmentResource;
use App\Models\StaffDepartment;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StaffDepartmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = StaffDepartment::withCount('staffProfiles');

        if ($request->boolean('active_only')) {
            $query->active();
        }

        $departments = $query->orderBy('name')->get();

        return response([
            'data' => StaffDepartmentResource::collection($departments),
        ], Response::HTTP_OK);
    }

    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:staff_departments,name'],
            'code' => ['required', 'string', 'max:50', 'unique:staff_departments,code'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $department = StaffDepartment::create($validated);

        return response([
            'data' => new StaffDepartmentResource($department),
        ], Response::HTTP_CREATED);
    }

    public function show(string $id): Response
    {
        $department = StaffDepartment::withCount('staffProfiles')->findOrFail($id);

        return response([
            'data' => new StaffDepartmentResource($department),
        ], Response::HTTP_OK);
    }

    public function update(Request $request, string $id): Response
    {
        $department = StaffDepartment::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', "unique:staff_departments,name,{$id}"],
            'code' => ['sometimes', 'string', 'max:50', "unique:staff_departments,code,{$id}"],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $department->update($validated);

        return response([
            'data' => new StaffDepartmentResource($department->fresh()),
        ], Response::HTTP_OK);
    }

    public function destroy(string $id): Response
    {
        $department = StaffDepartment::findOrFail($id);

        if ($department->staffProfiles()->exists()) {
            return response([
                'message' => 'Cannot delete department with assigned staff members',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $department->delete();

        return response()->noContent();
    }
}
