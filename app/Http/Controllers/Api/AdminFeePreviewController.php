<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExtracurricularActivity;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;

class AdminFeePreviewController extends Controller
{
    /**
     * Analyze the Excel file without importing. Returns validation report.
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:4096'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        $sheets = Excel::toArray(null, $file);

        if (empty($sheets)) {
            return response([
                'message' => 'Excel file is empty or invalid.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $report = [
            'class_fees' => ['header_ok' => false, 'rows_valid' => 0, 'rows_invalid' => 0, 'issues' => []],
            'transport_fees' => ['header_ok' => false, 'rows_valid' => 0, 'rows_invalid' => 0, 'issues' => [], 'not_found_students' => []],
            'activities' => ['header_ok' => false, 'rows_count' => 0, 'activity_names' => [], 'issues' => []],
            'student_activities' => ['header_ok' => false, 'rows_valid' => 0, 'rows_invalid' => 0, 'issues' => [], 'not_found_students' => [], 'undefined_activities' => []],
        ];

        $notFoundKeys = [];

        // Sheet 1: ClassFees
        if (isset($sheets[0]) && is_array($sheets[0]) && count($sheets[0]) > 1) {
            $classRows = $sheets[0];
            $header = array_map(static fn ($v) => trim((string) $v), array_shift($classRows));

            $report['class_fees']['header_ok'] = (strtolower($header[0] ?? '') === 'class name') && (strtolower($header[1] ?? '') === 'base fee');

            if (! $report['class_fees']['header_ok']) {
                $report['class_fees']['issues'][] = ['row' => 1, 'message' => 'Headers must be: Class Name, Base Fee', 'column' => 'A:B'];
            } else {
                foreach ($classRows as $index => $row) {
                    $className = trim((string) ($row[0] ?? ''));
                    $baseFee = (string) ($row[1] ?? '');

                    if ($className === '' || $baseFee === '') {
                        continue;
                    }

                    $class = SchoolClass::where('name', $className)->first();
                    if (! $class) {
                        $report['class_fees']['rows_invalid']++;
                        $report['class_fees']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Class "%s" not found in system', $className), 'class_name' => $className];
                    } else {
                        $report['class_fees']['rows_valid']++;
                    }
                }
            }
        } else {
            $report['class_fees']['issues'][] = ['row' => null, 'message' => 'Sheet 1 (ClassFees) is missing or empty', 'column' => null];
        }

        // Sheet 2: TransportFees
        if (isset($sheets[1]) && is_array($sheets[1]) && count($sheets[1]) > 1) {
            $transportRows = $sheets[1];
            $header = array_map(static fn ($v) => trim((string) $v), array_shift($transportRows));

            $report['transport_fees']['header_ok'] =
                strtolower($header[0] ?? '') === 'student name'
                && strtolower($header[1] ?? '') === 'class'
                && strtolower($header[2] ?? '') === 'transport fee';

            if (! $report['transport_fees']['header_ok']) {
                $report['transport_fees']['issues'][] = ['row' => 1, 'message' => 'Headers must be: Student Name, Class, Transport Fee', 'column' => 'A:C'];
            } else {
                foreach ($transportRows as $index => $row) {
                    $studentName = trim((string) ($row[0] ?? ''));
                    $className = trim((string) ($row[1] ?? ''));
                    $fee = (string) ($row[2] ?? '');
                    $email = trim((string) ($row[3] ?? ''));

                    if ($studentName === '' || $className === '' || $fee === '') {
                        continue;
                    }

                    $class = SchoolClass::where('name', $className)->first();
                    if (! $class) {
                        $report['transport_fees']['rows_invalid']++;
                        $report['transport_fees']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Class "%s" not found', $className), 'class_name' => $className];

                        continue;
                    }

                    $query = User::where('name', $studentName)->where('class_id', $class->id);
                    if ($email !== '') {
                        $query->where('email', $email);
                    }
                    $users = $query->get();

                    if ($users->isEmpty()) {
                        $report['transport_fees']['rows_invalid']++;
                        $key = $studentName.'|'.$className;
                        if (! in_array($key, $notFoundKeys, true)) {
                            $notFoundKeys[] = $key;
                            $report['transport_fees']['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                        }
                        $report['transport_fees']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Student "%s" in class "%s" not found', $studentName, $className), 'student_name' => $studentName, 'class' => $className];
                    } elseif ($users->count() > 1) {
                        $report['transport_fees']['rows_invalid']++;
                        $report['transport_fees']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Multiple students named "%s" in class "%s" - add Student Email column', $studentName, $className), 'student_name' => $studentName, 'class' => $className];
                    } else {
                        $report['transport_fees']['rows_valid']++;
                    }
                }
            }
        } else {
            $report['transport_fees']['issues'][] = ['row' => null, 'message' => 'Sheet 2 (TransportFees) is missing or empty', 'column' => null];
        }

        // Sheet 3: Activities
        $activityNamesFromSheet = [];
        if (isset($sheets[2]) && is_array($sheets[2]) && count($sheets[2]) > 1) {
            $activityRows = $sheets[2];
            $header = array_map(static fn ($v) => trim((string) $v), array_shift($activityRows));

            $report['activities']['header_ok'] = (strtolower($header[0] ?? '') === 'activity name') && (strtolower($header[1] ?? '') === 'price');

            if (! $report['activities']['header_ok']) {
                $report['activities']['issues'][] = ['row' => 1, 'message' => 'Headers must be: Activity Name, Price', 'column' => 'A:B'];
            } else {
                foreach ($activityRows as $index => $row) {
                    $name = trim((string) ($row[0] ?? ''));
                    $price = (string) ($row[1] ?? '');

                    if ($name === '' || $price === '') {
                        continue;
                    }

                    $activityNamesFromSheet[] = $name;
                    $report['activities']['rows_count']++;
                }
                $report['activities']['activity_names'] = array_values(array_unique($activityNamesFromSheet));
            }
        } else {
            $report['activities']['issues'][] = ['row' => null, 'message' => 'Sheet 3 (Activities) is missing or empty', 'column' => null];
        }

        // Sheet 4: StudentActivities
        if (isset($sheets[3]) && is_array($sheets[3]) && count($sheets[3]) > 1) {
            $studentActivitiesRows = $sheets[3];
            $header = array_map(static fn ($v) => trim((string) $v), array_shift($studentActivitiesRows));

            $report['student_activities']['header_ok'] =
                strtolower($header[0] ?? '') === 'student name'
                && strtolower($header[1] ?? '') === 'class';

            if (! $report['student_activities']['header_ok']) {
                $report['student_activities']['issues'][] = ['row' => 1, 'message' => 'First two headers must be: Student Name, Class. Remaining columns = activity names (e.g. Skating, Chess)', 'column' => 'A:B'];
            } else {
                $activityNamesAvailable = array_merge(
                    $activityNamesFromSheet,
                    ExtracurricularActivity::pluck('name')->all(),
                );
                $activityNamesAvailable = array_values(array_unique($activityNamesAvailable));

                foreach ($header as $colIndex => $col) {
                    if ($colIndex < 2 || trim((string) $col) === '') {
                        continue;
                    }
                    $colName = trim((string) $col);
                    if (! in_array($colName, $activityNamesAvailable, true)) {
                        $report['student_activities']['undefined_activities'][] = $colName;
                    }
                }

                foreach ($studentActivitiesRows as $index => $row) {
                    $studentName = trim((string) ($row[0] ?? ''));
                    $className = trim((string) ($row[1] ?? ''));

                    if ($studentName === '' || $className === '') {
                        continue;
                    }

                    $class = SchoolClass::where('name', $className)->first();
                    if (! $class) {
                        $report['student_activities']['rows_invalid']++;
                        $report['student_activities']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Class "%s" not found', $className), 'class_name' => $className];

                        continue;
                    }

                    $users = User::where('name', $studentName)->where('class_id', $class->id)->get();

                    if ($users->isEmpty()) {
                        $report['student_activities']['rows_invalid']++;
                        $key = $studentName.'|'.$className;
                        if (! in_array($key, $notFoundKeys, true)) {
                            $notFoundKeys[] = $key;
                            $report['student_activities']['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                        }
                        $report['student_activities']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Student "%s" in class "%s" not found', $studentName, $className), 'student_name' => $studentName, 'class' => $className];
                    } elseif ($users->count() > 1) {
                        $report['student_activities']['rows_invalid']++;
                        $report['student_activities']['issues'][] = ['row' => $index + 2, 'message' => sprintf('Multiple students named "%s" in class "%s"', $studentName, $className), 'student_name' => $studentName, 'class' => $className];
                    } else {
                        $report['student_activities']['rows_valid']++;
                    }
                }
            }
        } else {
            $report['student_activities']['issues'][] = ['row' => null, 'message' => 'Sheet 4 (StudentActivities) is missing or empty', 'column' => null];
        }

        return response($report, Response::HTTP_OK);
    }
}
