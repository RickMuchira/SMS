<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeeClassController extends Controller
{
    public function index(): Response
    {
        $classes = SchoolClass::query()
            ->orderBy('name')
            ->get();

        return response($classes, Response::HTTP_OK);
    }

    public function update(Request $request, string $id): Response
    {
        $class = SchoolClass::findOrFail($id);

        $validated = $request->validate([
            'base_fee' => ['required', 'numeric', 'min:0'],
        ]);

        $class->update(['base_fee' => $validated['base_fee']]);

        return response($class->fresh(), Response::HTTP_OK);
    }
}
