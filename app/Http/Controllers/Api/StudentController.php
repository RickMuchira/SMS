<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\EmailGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

class StudentController extends Controller
{
    /**
     * Display a listing of students (users with student role).
     */
    public function index(Request $request): Response
    {
        $students = User::role('student')
            ->with(['roles', 'schoolClass'])
            ->orderBy('name')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('guardian_phone', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('class_id'), function ($query) use ($request) {
                $query->where('class_id', $request->integer('class_id'));
            })
            ->paginate($request->integer('per_page', 20));

        return response($students, Response::HTTP_OK);
    }

    /**
     * Store a newly created student account.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            'class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:20', 'unique:users,guardian_phone'],
            'guardian_relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
        ]);

        // Auto-generate email if not provided
        if (empty($validated['email'])) {
            $validated['email'] = EmailGeneratorService::generateFromName($validated['name']);
        }

        // Set password: guardian phone if provided, otherwise require it
        if (empty($validated['password'])) {
            if (! empty($validated['guardian_phone'])) {
                $validated['password'] = $validated['guardian_phone'];
            } else {
                return response([
                    'message' => 'Either password or guardian_phone must be provided.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'class_id' => $validated['class_id'] ?? null,
            'guardian_name' => $validated['guardian_name'] ?? null,
            'guardian_phone' => $validated['guardian_phone'] ?? null,
            'guardian_relationship' => $validated['guardian_relationship'] ?? null,
        ]);

        $studentRole = Role::where('name', 'student')->first();
        if ($studentRole !== null) {
            $user->assignRole($studentRole);
        }

        return response([
            'user' => $user->fresh(['roles', 'schoolClass']),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified student.
     */
    public function show(string $id): Response
    {
        $user = User::role('student')->with(['roles', 'schoolClass'])->findOrFail($id);

        return response([
            'user' => $user,
        ], Response::HTTP_OK);
    }

    /**
     * Update the specified student.
     */
    public function update(Request $request, string $id): Response
    {
        $user = User::role('student')->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'string', 'min:8'],
            'class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:20', 'unique:users,guardian_phone,'.$user->id],
            'guardian_relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
        ]);

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }
        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }
        if (array_key_exists('password', $validated)) {
            $user->password = Hash::make($validated['password']);
        }
        if (array_key_exists('class_id', $validated)) {
            $user->class_id = $validated['class_id'];
        }
        if (array_key_exists('guardian_name', $validated)) {
            $user->guardian_name = $validated['guardian_name'];
        }
        if (array_key_exists('guardian_phone', $validated)) {
            $user->guardian_phone = $validated['guardian_phone'];
        }
        if (array_key_exists('guardian_relationship', $validated)) {
            $user->guardian_relationship = $validated['guardian_relationship'];
        }

        $user->save();

        return response([
            'user' => $user->fresh(['roles', 'schoolClass']),
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified student account.
     */
    public function destroy(string $id): Response
    {
        $user = User::role('student')->findOrFail($id);
        $user->delete();

        return response()->noContent();
    }

    /**
     * Import students from CSV.
     *
     * Expected CSV columns: full_name,class_name,guardian_name,guardian_phone,guardian_relationship
     */
    public function import(Request $request): Response
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $file = $request->file('file');
        if (! $file) {
            return response(['message' => 'No file uploaded.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $path = $file->getRealPath();
        $handle = fopen($path, 'r');
        if (! $handle) {
            return response(['message' => 'Could not open file.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);

            return response(['message' => 'CSV file is empty or invalid.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Normalize header to lowercase
        $header = array_map('strtolower', array_map('trim', $header));

        $expectedColumns = ['full_name', 'class_name', 'guardian_name', 'guardian_phone', 'guardian_relationship'];
        $missing = array_diff($expectedColumns, $header);
        if (! empty($missing)) {
            fclose($handle);

            return response([
                'message' => 'Missing required columns: '.implode(', ', $missing),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $results = [
            'created' => 0,
            'updated' => 0,
            'errors' => [],
        ];

        $studentRole = Role::where('name', 'student')->first();

        $lineNumber = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $lineNumber++;
            $data = array_combine($header, $row);

            $fullName = trim($data['full_name'] ?? '');
            $className = trim($data['class_name'] ?? '');
            $guardianName = trim($data['guardian_name'] ?? '');
            $guardianPhone = trim($data['guardian_phone'] ?? '');
            $guardianRelationship = trim($data['guardian_relationship'] ?? '');

            if (empty($fullName)) {
                $results['errors'][] = "Line {$lineNumber}: Missing full_name";

                continue;
            }

            // Find class by name
            $class = null;
            if (! empty($className)) {
                $class = SchoolClass::where('name', $className)->first();
                if (! $class) {
                    $results['errors'][] = "Line {$lineNumber}: Class '{$className}' not found";

                    continue;
                }
            }

            // Try to find existing student by guardian phone (unique identifier)
            $existingUser = null;
            if (! empty($guardianPhone)) {
                $existingUser = User::where('guardian_phone', $guardianPhone)->first();
            }

            // If not found by phone, try by generated email
            if (! $existingUser) {
                $generatedEmail = EmailGeneratorService::generateFromName($fullName);
                $existingUser = User::where('email', $generatedEmail)->first();
            }

            try {
                if ($existingUser) {
                    // Update existing
                    $existingUser->update([
                        'name' => $fullName,
                        'class_id' => $class?->id,
                        'guardian_name' => $guardianName ?: null,
                        'guardian_phone' => $guardianPhone ?: null,
                        'guardian_relationship' => $guardianRelationship ?: null,
                    ]);
                    $results['updated']++;
                } else {
                    // Create new
                    $email = EmailGeneratorService::generateFromName($fullName);
                    $password = ! empty($guardianPhone) ? $guardianPhone : bin2hex(random_bytes(8));

                    $user = User::create([
                        'name' => $fullName,
                        'email' => $email,
                        'password' => Hash::make($password),
                        'class_id' => $class?->id,
                        'guardian_name' => $guardianName ?: null,
                        'guardian_phone' => $guardianPhone ?: null,
                        'guardian_relationship' => $guardianRelationship ?: null,
                    ]);

                    if ($studentRole) {
                        $user->assignRole($studentRole);
                    }

                    $results['created']++;
                }
            } catch (\Exception $e) {
                Log::error('Import student error', ['line' => $lineNumber, 'error' => $e->getMessage()]);
                $results['errors'][] = "Line {$lineNumber}: {$e->getMessage()}";
            }
        }

        fclose($handle);

        return response($results, Response::HTTP_OK);
    }
}
