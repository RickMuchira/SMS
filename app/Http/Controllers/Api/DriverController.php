<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DriverController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view drivers')->only(['index', 'show']);
        $this->middleware('permission:manage drivers')->only(['store', 'update', 'destroy']);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return response([
            'message' => 'List drivers (requires view drivers permission).',
        ], Response::HTTP_OK);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): Response
    {
        return response([
            'message' => 'Create driver (requires manage drivers permission).',
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        return response([
            'message' => 'Show driver (requires view drivers permission).',
            'id' => $id,
        ], Response::HTTP_OK);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): Response
    {
        return response([
            'message' => 'Update driver (requires manage drivers permission).',
            'id' => $id,
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): Response
    {
        return response()->noContent();
    }
}
