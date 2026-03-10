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
        $students = User::query()
            ->with(['roles', 'schoolClass'])
            ->where(function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->where('name', 'student');
                })->orWhereNotNull('class_id');
            })
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
        // Ensure all text fields are valid UTF-8 so JSON encoding never fails.
        $students->getCollection()->transform(function (User $user) {
            $user->name = self::cleanUtf8($user->name);
            $user->email = self::cleanUtf8($user->email);
            $user->guardian_name = self::cleanUtf8($user->guardian_name);
            $user->guardian_phone = self::cleanUtf8($user->guardian_phone);
            $user->guardian_relationship = self::cleanUtf8($user->guardian_relationship);

            if (is_array($user->extra_guardians)) {
                $user->extra_guardians = collect($user->extra_guardians)
                    ->map(function (array $g) {
                        return [
                            'name' => self::cleanUtf8($g['name'] ?? null),
                            'phone' => self::cleanUtf8($g['phone'] ?? null),
                            'relationship' => self::cleanUtf8($g['relationship'] ?? null),
                        ];
                    })
                    ->all();
            }

            if ($user->relationLoaded('schoolClass') && $user->schoolClass !== null) {
                $user->schoolClass->name = self::cleanUtf8($user->schoolClass->name);
            }

            return $user;
        });

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
            'guardian_relationship' => ['nullable', 'string', 'max:50'],
            'extra_guardians' => ['nullable', 'array'],
            'extra_guardians.*.name' => ['required_with:extra_guardians.*.phone', 'string', 'max:255'],
            'extra_guardians.*.phone' => ['nullable', 'string', 'max:20'],
            'extra_guardians.*.relationship' => ['nullable', 'string', 'max:50'],
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
            'guardian_relationship' => ['nullable', 'string', 'max:50'],
            'extra_guardians' => ['nullable', 'array'],
            'extra_guardians.*.name' => ['required_with:extra_guardians.*.phone', 'string', 'max:255'],
            'extra_guardians.*.phone' => ['nullable', 'string', 'max:20'],
            'extra_guardians.*.relationship' => ['nullable', 'string', 'max:50'],
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
        // Strip UTF-8 BOM and other non-printable/control characters that can
        // appear at the start of CSV / Excel-exported headers, then normalize.
        $value = preg_replace('/^\xEF\xBB\xBF/u', '', $value) ?? $value;
        $value = preg_replace('/[[:^print:]]/u', '', $value) ?? $value;
        // Replace non-breaking spaces (U+00A0) with regular spaces so headers like "Phone Number"
        // normalise correctly to phone_number.
        $value = str_replace("\u{00A0}", ' ', $value);

        return str_replace(' ', '_', strtolower(trim($value)));
    }

    /**
     * Clean a string to ensure it is valid UTF-8 and free of problematic control characters.
     */
    private static function cleanUtf8(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $converted = @mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        if ($converted === false) {
            $converted = $value;
        }

        // Remove all control characters except newlines and tabs.
        $converted = preg_replace('/[^\P{C}\n\t]/u', '', $converted) ?? $converted;

        return $converted;
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
            'guardian_name' => [
                'guardian_name',
                'guardianname',
                'guardian_1_name',
                'guardian_2_name',
                'guardian_3_name',
                'guardian1_name',
                'guardian2_name',
                'guardian3_name',
                'guardian_name_1',
                'guardian_name_2',
                'guardian_name_3',
                'guardian_2_name',
                'guardian_3_name',
                'parent_name',
                'parent_1_name',
                'parent_2_name',
                'mother_name',
                'father_name',
                'mothers_name',
                'fathers_name',
                'contact_name',
                'emergency_contact',
                'caregiver_name',
                'name_of_guardian',
                'name_of_parent',
            ],
            'guardian_phone' => [
                'guardian_phone',
                'guardianphone',
                'phone',
                'phone_number',
                'phonenumber',
                'phone_number_1',
                'phone_number_2',
                'phone_number_3',
                'phone_2',
                'phone_3',
                'phone_numl', // Handle typo: phone_numl -> phone_number
                'phone_num', // Handle shortened: phone_num -> phone_number
                'parent_phone',
                'parent_number',
                'mother_phone',
                'father_phone',
                'contact_phone',
                'contact_number',
                'mobile',
                'mobile_number',
                'telephone',
                'guardian_1_phone',
                'guardian_2_phone',
                'guardian_3_phone',
                'guardian1_phone',
                'guardian2_phone',
                'guardian3_phone',
            ],
            'guardian_relationship' => [
                'guardian_relationship',
                'guardianrelationship',
                'relationship',
                'relationship_2',
                'relationship_3',
                'relation',
                'relationship_to_student',
                'relation_to_child',
                'parent_type',
                'guardian_type',
            ],
        ];
        $headerToCanonical = [];
        foreach ($headers as $h) {
            $norm = self::normalizeHeaderKey((string) $h);
            $matched = false;
            foreach ($aliases as $canonical => $variants) {
                if (in_array($norm, $variants, true)) {
                    $headerToCanonical[$norm] = $canonical;
                    $matched = true;
                    break;
                }
            }
            // Fuzzy match for phone columns (handle common typos)
            if (! $matched && preg_match('/^phone.*num/i', $norm)) {
                $headerToCanonical[$norm] = 'guardian_phone';
                $matched = true;
            }
            if (! $matched) {
                $headerToCanonical[$norm] = $norm;
            }
        }

        return $headerToCanonical;
    }

    /**
     * Import students from CSV or Excel.
     *
     * Expected columns:
     * - full_name (or Full Name, Name, Student Name, etc.) - required
     * - class_name / Class - optional
     * - One or more guardian_name / Guardian Name columns (up to 3), each followed by a guardian_phone / Phone Number column.
     *
     * The first guardian in the row becomes the primary guardian (guardian_name / guardian_phone on the user),
     * and any additional guardians (up to 2 more) are stored in the extra_guardians JSON column.
     */
    public function import(Request $request): Response
    {
        $request->validate([
            'file' => ['required', 'file', 'max:2048'],
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

            $rawHeader = fgetcsv($handle, 0, ',', '"', '\\');
            if (! $rawHeader) {
                fclose($handle);

                return response(['message' => 'CSV file is empty or invalid.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $header = array_map(fn ($h) => self::normalizeHeaderKey((string) $h), $rawHeader);
            $headerToCanonical = self::mapHeadersToCanonical($rawHeader);
            $hasFullName = in_array('full_name', array_values($headerToCanonical), true);
            if (! $hasFullName && isset($header[0]) && $header[0] !== '') {
                // Fallback: assume first column is full_name to handle slightly malformed exports.
                $headerToCanonical[$header[0]] = 'full_name';
                $hasFullName = true;
            }
            if (! $hasFullName) {
                fclose($handle);

                return response([
                    'message' => 'Missing required column for student name. Use full_name, Full Name, Name, or Student Name. Other columns: class_name, guardian_name, guardian_phone.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rows[] = $header;
            while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
                $rows[] = $row;
            }

            fclose($handle);
        } else {
            // Excel/ODS (xlsx/xls/ods) — use PhpSpreadsheet's auto-detection so we correctly
            // handle ODS files even when they are saved with a .xlsx extension.
            try {
                $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($file->getRealPath());
                $reader->setReadDataOnly(true);
                $spreadsheet = $reader->load($file->getRealPath());
                $sheet = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
                if (empty($sheet)) {
                    return response([
                        'message' => 'The uploaded spreadsheet appears to be empty.',
                    ], Response::HTTP_UNPROCESSABLE_ENTITY);
                }
                $rows = $sheet;
                $rawHeader = array_shift($rows);
            } catch (\Throwable $e) {
                Log::info('Student import: Excel/ODS read failed', [
                    'error' => $e->getMessage(),
                    'extension' => $extension,
                ]);

                return response([
                    'message' => 'Could not read your Excel/ODS file. Please open it and ensure it is a valid spreadsheet, then try again.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Excel/ODS read succeeded — build header map.
            $header = array_map(fn ($h) => self::normalizeHeaderKey((string) $h), $rawHeader);
            $headerToCanonical = self::mapHeadersToCanonical($rawHeader);
            $hasFullName = in_array('full_name', array_values($headerToCanonical), true);
            if (! $hasFullName && isset($header[0]) && $header[0] !== '') {
                $headerToCanonical[$header[0]] = 'full_name';
                $hasFullName = true;
            }
            if (! $hasFullName) {
                return response([
                    'message' => 'Missing required column for student name. Use full_name, Full Name, Name, or Student Name. Also include class_name (for example: Class) plus optional guardian_name / guardian_phone columns.',
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

        // Determine important column indices for structured parsing.
        $fullNameIndex = null;
        $classNameIndex = null;
        $guardianColumns = []; // each: ['name' => ?int, 'phone' => ?int, 'relationship' => ?int]

        foreach ($header as $index => $normKey) {
            $canonical = $headerToCanonical[$normKey] ?? $normKey;
            if ($canonical === 'full_name' && $fullNameIndex === null) {
                $fullNameIndex = $index;
            } elseif ($canonical === 'class_name' && $classNameIndex === null) {
                $classNameIndex = $index;
            } elseif ($canonical === 'guardian_name') {
                $guardianColumns[] = ['name' => $index, 'phone' => null, 'relationship' => null];
            } elseif ($canonical === 'guardian_phone') {
                $lastIndex = count($guardianColumns) - 1;
                if ($lastIndex >= 0 && $guardianColumns[$lastIndex]['phone'] === null) {
                    $guardianColumns[$lastIndex]['phone'] = $index;
                } else {
                    $guardianColumns[] = ['name' => null, 'phone' => $index, 'relationship' => null];
                }
            } elseif ($canonical === 'guardian_relationship') {
                $lastIndex = count($guardianColumns) - 1;
                if ($lastIndex >= 0 && $guardianColumns[$lastIndex]['relationship'] === null) {
                    $guardianColumns[$lastIndex]['relationship'] = $index;
                } else {
                    $guardianColumns[] = ['name' => null, 'phone' => null, 'relationship' => $index];
                }
            }
        }

        // Ensure guardian columns are processed left-to-right regardless of header ordering.
        usort($guardianColumns, function (array $a, array $b): int {
            $aIndex = min(
                array_filter([$a['name'], $a['phone'], $a['relationship']], static fn ($v) => $v !== null) ?: [PHP_INT_MAX]
            );
            $bIndex = min(
                array_filter([$b['name'], $b['phone'], $b['relationship']], static fn ($v) => $v !== null) ?: [PHP_INT_MAX]
            );

            return $aIndex <=> $bIndex;
        });

        // First pass: parse rows and collect emails for bulk user lookup
        $dataRows = [];
        $lineNumber = 0;
        foreach ($rows as $row) {
            $lineNumber++;
            if ($lineNumber === 1) {
                continue;
            }

            $padded = array_pad(
                array_map(
                    fn ($v) => is_scalar($v)
                        ? trim((string) self::cleanUtf8((string) $v))
                        : '',
                    $row
                ),
                count($header),
                ''
            );

            $fullName = $fullNameIndex !== null ? trim($padded[$fullNameIndex] ?? '') : '';
            if ($fullName === '') {
                $results['errors'][] = "Line {$lineNumber}: Missing full_name";

                continue;
            }

            $className = $classNameIndex !== null ? trim($padded[$classNameIndex] ?? '') : '';
            if ($className === '') {
                $results['errors'][] = "Line {$lineNumber}: Missing class_name";

                continue;
            }

            // Collect up to 3 guardians from repeated guardian_name/guardian_phone columns.
            $guardians = [];
            foreach ($guardianColumns as $guardianColumn) {
                $name = $guardianColumn['name'] !== null ? trim($padded[$guardianColumn['name']] ?? '') : '';
                $phone = $guardianColumn['phone'] !== null ? trim($padded[$guardianColumn['phone']] ?? '') : '';
                $relationship = $guardianColumn['relationship'] !== null ? trim($padded[$guardianColumn['relationship']] ?? '') : '';

                if ($name === '' && $phone === '') {
                    continue;
                }

                // Best-effort fix for Excel-stripped leading zeros on local phone numbers.
                if ($phone !== '' && ctype_digit($phone) && str_starts_with($phone, '0') === false && strlen($phone) >= 9) {
                    $phone = '0'.$phone;
                }

                $guardians[] = [
                    'name' => $name,
                    'phone' => $phone,
                    'relationship' => $relationship,
                ];

                if (count($guardians) >= 3) {
                    break;
                }
            }

            $primaryGuardian = $guardians[0] ?? ['name' => '', 'phone' => '', 'relationship' => ''];
            $extraGuardians = array_slice($guardians, 1);

            $generatedEmail = EmailGeneratorService::generateFromName($fullName);
            $baseEmail = EmailGeneratorService::getBaseEmailFromName($fullName);

            $dataRows[] = [
                'line' => $lineNumber,
                'full_name' => $fullName,
                'class_name' => $className,
                'guardian_name' => $primaryGuardian['name'],
                'guardian_phone' => $primaryGuardian['phone'],
                'guardian_relationship' => $primaryGuardian['relationship'],
                'extra_guardians' => $extraGuardians,
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
            $extraGuardians = $r['extra_guardians'];
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
                        'guardian_name' => $guardianName !== '' ? $guardianName : null,
                        'guardian_phone' => $guardianPhone !== '' ? $guardianPhone : null,
                        'guardian_relationship' => $guardianRelationship !== '' ? $guardianRelationship : null,
                        'extra_guardians' => $extraGuardians !== [] ? $extraGuardians : null,
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
                        'guardian_name' => $guardianName !== '' ? $guardianName : null,
                        'guardian_phone' => $guardianPhone !== '' ? $guardianPhone : null,
                        'guardian_relationship' => $guardianRelationship !== '' ? $guardianRelationship : null,
                        'extra_guardians' => $extraGuardians !== [] ? $extraGuardians : null,
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
