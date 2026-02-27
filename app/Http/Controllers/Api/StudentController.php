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
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Permission\Models\Role;

class StudentController extends Controller
{
    /**
     * Get groups of duplicate students (same base email from name).
     */
    public function duplicates(): Response
    {
        $students = User::role('student')
            ->with(['schoolClass'])
            ->orderBy('name')
            ->get();

        $groups = [];
        foreach ($students as $student) {
            $baseEmail = EmailGeneratorService::getBaseEmailFromName($student->name);
            if (! isset($groups[$baseEmail])) {
                $groups[$baseEmail] = [];
            }
            $groups[$baseEmail][] = $student;
        }

        $duplicates = array_values(array_filter($groups, fn ($group) => count($group) > 1));

        return response(['data' => $duplicates], Response::HTTP_OK);
    }

    /**
     * Bulk delete students by IDs.
     */
    public function bulkDestroy(Request $request): Response
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:users,id'],
        ]);

        $deleted = User::role('student')
            ->whereIn('id', $validated['ids'])
            ->delete();

        return response(['deleted' => $deleted], Response::HTTP_OK);
    }

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
            'guardian_phone' => ['nullable', 'string', 'max:20'],
            'guardian_relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
            'extra_guardians' => ['nullable', 'array'],
            'extra_guardians.*.name' => ['required_with:extra_guardians.*.phone', 'string', 'max:255'],
            'extra_guardians.*.phone' => ['nullable', 'string', 'max:20'],
            'extra_guardians.*.relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
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
            'extra_guardians' => $validated['extra_guardians'] ?? null,
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
            'guardian_phone' => ['nullable', 'string', 'max:20'],
            'guardian_relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
            'extra_guardians' => ['nullable', 'array'],
            'extra_guardians.*.name' => ['required_with:extra_guardians.*.phone', 'string', 'max:255'],
            'extra_guardians.*.phone' => ['nullable', 'string', 'max:20'],
            'extra_guardians.*.relationship' => ['nullable', 'string', 'in:Father,Mother,Guardian,Other'],
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
        if (array_key_exists('extra_guardians', $validated)) {
            $user->extra_guardians = $validated['extra_guardians'];
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
     * Normalize a CSV/Excel header to canonical key (handles "Full Name" -> full_name, etc.).
     */
    private static function normalizeHeaderKey(string $value): string
    {
        return str_replace(' ', '_', strtolower(trim($value)));
    }

    /**
     * Map normalized header to canonical column name for import.
     *
     * @return array<string, string> original_header => canonical_key
     */
    private static function mapHeadersToCanonical(array $headers): array
    {
        $aliases = [
            'full_name' => ['full_name', 'fullname', 'student_name', 'studentname', 'name'],
            'class_name' => ['class_name', 'classname', 'class'],
            'guardian_name' => ['guardian_name', 'guardianname'],
            'guardian_phone' => ['guardian_phone', 'guardianphone', 'phone'],
            'guardian_relationship' => ['guardian_relationship', 'guardianrelationship', 'relationship'],
        ];
        $headerToCanonical = [];
        foreach ($headers as $h) {
            $norm = self::normalizeHeaderKey((string) $h);
            foreach ($aliases as $canonical => $variants) {
                if (in_array($norm, $variants, true)) {
                    $headerToCanonical[$norm] = $canonical;
                    break;
                }
            }
            if (! isset($headerToCanonical[$norm])) {
                $headerToCanonical[$norm] = $norm;
            }
        }

        return $headerToCanonical;
    }

    /**
     * Import students from CSV or Excel.
     *
     * Expected columns: full_name (or Full Name, Name, etc.), class_name, guardian_name, guardian_phone, guardian_relationship
     */
    public function import(Request $request): Response
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:2048'],
        ]);

        $file = $request->file('file');
        if (! $file) {
            return response(['message' => 'No file uploaded.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $extension = strtolower($file->getClientOriginalExtension());

        $rows = [];
        if (in_array($extension, ['csv', 'txt'], true)) {
            $path = $file->getRealPath();
            $handle = fopen($path, 'r');
            if (! $handle) {
                return response(['message' => 'Could not open file.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rawHeader = fgetcsv($handle);
            if (! $rawHeader) {
                fclose($handle);

                return response(['message' => 'CSV file is empty or invalid.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $header = array_map(fn ($h) => self::normalizeHeaderKey((string) $h), $rawHeader);
            $headerToCanonical = self::mapHeadersToCanonical($rawHeader);
            $hasFullName = in_array('full_name', array_values($headerToCanonical), true);
            if (! $hasFullName) {
                fclose($handle);

                return response([
                    'message' => 'Missing required column for student name. Use full_name, Full Name, Name, or Student Name. Other columns: class_name, guardian_name, guardian_phone, guardian_relationship.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rows[] = $header;
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }

            fclose($handle);
        } else {
            // Excel (xlsx/xls)
            $sheets = Excel::toArray(null, $file);
            $sheet = $sheets[0] ?? [];
            if (empty($sheet)) {
                return response(['message' => 'Excel file is empty or invalid.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rows = $sheet;
            $rawHeader = array_shift($rows);
            if (! $rawHeader) {
                return response(['message' => 'Excel file is empty or invalid.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $header = array_map(fn ($h) => self::normalizeHeaderKey((string) $h), $rawHeader);
            $headerToCanonical = self::mapHeadersToCanonical($rawHeader);
            $hasFullName = in_array('full_name', array_values($headerToCanonical), true);
            if (! $hasFullName) {
                return response([
                    'message' => 'Missing required column for student name. Use full_name, Full Name, Name, or Student Name. Other columns: class_name, guardian_name, guardian_phone, guardian_relationship.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            array_unshift($rows, $header);
        }

        $results = [
            'created' => 0,
            'updated' => 0,
            'errors' => [],
        ];

        // Preload all classes once (avoids N queries per row)
        $classIdsByName = SchoolClass::pluck('id', 'name')->all();

        $studentRole = Role::where('name', 'student')->first();

        // First pass: parse rows and collect emails for bulk user lookup
        $dataRows = [];
        $lineNumber = 0;
        foreach ($rows as $row) {
            $lineNumber++;
            if ($lineNumber === 1) {
                continue;
            }
            $padded = array_pad(array_map(fn ($v) => is_scalar($v) ? trim((string) $v) : '', $row), count($header), '');
            $rawData = array_combine($header, array_slice($padded, 0, count($header)));
            $data = [];
            foreach ($rawData as $normKey => $value) {
                $canonical = $headerToCanonical[$normKey] ?? $normKey;
                $data[$canonical] = $value;
            }
            $fullName = trim($data['full_name'] ?? '');
            $className = trim($data['class_name'] ?? '');
            $guardianName = trim($data['guardian_name'] ?? '');
            $guardianPhone = trim($data['guardian_phone'] ?? '');
            $guardianRelationship = trim($data['guardian_relationship'] ?? '');
            if (empty($fullName)) {
                $results['errors'][] = "Line {$lineNumber}: Missing full_name";

                continue;
            }
            $generatedEmail = EmailGeneratorService::generateFromName($fullName);
            $baseEmail = EmailGeneratorService::getBaseEmailFromName($fullName);
            $dataRows[] = [
                'line' => $lineNumber,
                'full_name' => $fullName,
                'class_name' => $className,
                'guardian_name' => $guardianName,
                'guardian_phone' => $guardianPhone,
                'guardian_relationship' => $guardianRelationship,
                'email' => $generatedEmail,
                'base_email' => $baseEmail,
            ];
        }

        $allEmails = array_values(array_unique(array_merge(
            array_column($dataRows, 'email'),
            array_column($dataRows, 'base_email')
        )));

        // Load existing STUDENT users by email only.
        // Do NOT match by guardian_phone (siblings share the same phone).
        $existingUsers = collect();
        if (! empty($allEmails)) {
            $existingUsers = User::role('student')
                ->whereIn('email', $allEmails)
                ->get();
        }
        $usersByEmail = $existingUsers->keyBy('email')->all();
        $createdInRun = []; // email => User, for duplicate rows in same file

        foreach ($dataRows as $r) {
            $lineNumber = $r['line'];
            $fullName = $r['full_name'];
            $className = $r['class_name'];
            $guardianName = $r['guardian_name'];
            $guardianPhone = $r['guardian_phone'];
            $guardianRelationship = $r['guardian_relationship'];
            $generatedEmail = $r['email'];
            $baseEmail = $r['base_email'];

            $classId = null;
            if ($className !== '') {
                $classId = $classIdsByName[$className] ?? null;
                if ($classId === null) {
                    $results['errors'][] = "Line {$lineNumber}: Class '{$className}' not found";

                    continue;
                }
            }

            // Match by generated email first, then base email (handles re-import: base exists, generated gets "2")
            $existingUser = $usersByEmail[$generatedEmail] ?? $usersByEmail[$baseEmail] ?? $createdInRun[$generatedEmail] ?? null;

            try {
                if ($existingUser) {
                    $existingUser->update([
                        'name' => $fullName,
                        'class_id' => $classId,
                        'guardian_name' => $guardianName ?: null,
                        'guardian_phone' => $guardianPhone ?: null,
                        'guardian_relationship' => $guardianRelationship ?: null,
                    ]);
                    $results['updated']++;
                    // So next row with same email finds this user if we created in this run
                    if (isset($createdInRun[$generatedEmail])) {
                        $usersByEmail[$generatedEmail] = $existingUser;
                    }
                } else {
                    $password = $guardianPhone !== '' ? $guardianPhone : bin2hex(random_bytes(8));
                    $user = User::create([
                        'name' => $fullName,
                        'email' => $generatedEmail,
                        'password' => Hash::make($password),
                        'class_id' => $classId,
                        'guardian_name' => $guardianName ?: null,
                        'guardian_phone' => $guardianPhone ?: null,
                        'guardian_relationship' => $guardianRelationship ?: null,
                    ]);
                    if ($studentRole) {
                        $user->assignRole($studentRole);
                    }
                    $results['created']++;
                    $createdInRun[$generatedEmail] = $user;
                    $usersByEmail[$generatedEmail] = $user;
                }
            } catch (\Exception $e) {
                Log::error('Import student error', ['line' => $lineNumber, 'error' => $e->getMessage()]);
                $results['errors'][] = "Line {$lineNumber}: {$e->getMessage()}";
            }
        }

        return response($results, Response::HTTP_OK);
    }
}
