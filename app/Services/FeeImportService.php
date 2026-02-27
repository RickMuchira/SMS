<?php

namespace App\Services;

use App\Models\AcademicTerm;
use App\Models\ExtracurricularActivity;
use App\Models\SchoolClass;
use App\Models\StudentActivity;
use App\Models\StudentTermBalance;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FeeImportService
{
    /**
     * Process fee import sheets. Each sheet is array of rows; first row is header.
     *
     * @param  array<int, array<int, mixed>>  $sheets  [0]=ClassFees, [1]=TransportFees, [2]=Activities, [3]=StudentActivities
     * @return array{updated_classes: int, updated_transport: int, activities_upserted: int, student_activities_created: int, errors: list<string>, not_found_students: list<array{name: string, class: string}>}
     */
    public static function process(AcademicTerm $term, array $sheets): array
    {
        $result = [
            'updated_classes' => 0,
            'updated_transport' => 0,
            'activities_upserted' => 0,
            'student_activities_created' => 0,
            'debit_credit_updated' => 0,
            'amount_paid_updated' => 0,
            'errors' => [],
            'not_found_students' => [],
        ];

        $notFoundKeys = [];

        DB::beginTransaction();

        try {
            if (isset($sheets[0]) && is_array($sheets[0]) && count($sheets[0]) > 1) {
                $classRows = $sheets[0];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($classRows));

                if ((strtolower($header[0] ?? '') !== 'class name') || (strtolower($header[1] ?? '') !== 'base fee')) {
                    $result['errors'][] = 'ClassFees sheet must have headers: Class Name, Base Fee [, Uniform Fee]';
                } else {
                    foreach ($classRows as $index => $row) {
                        $className = trim((string) ($row[0] ?? ''));
                        $baseFee = (string) ($row[1] ?? '');
                        $uniformFee = isset($row[2]) ? (string) $row[2] : null;

                        if ($className === '' || $baseFee === '') {
                            continue;
                        }

                        $class = SchoolClass::where('name', $className)->first();

                        if (! $class) {
                            $result['errors'][] = sprintf('ClassFees row %d: Class "%s" not found.', $index + 2, $className);

                            continue;
                        }

                        $class->base_fee = (float) $baseFee;
                        if ($uniformFee !== null && trim($uniformFee) !== '') {
                            $class->uniform_fee = (float) $uniformFee;
                        }
                        $class->save();
                        $result['updated_classes']++;
                    }
                }
            }

            if (isset($sheets[1]) && is_array($sheets[1]) && count($sheets[1]) > 1) {
                $transportRows = $sheets[1];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($transportRows));

                if (
                    strtolower($header[0] ?? '') !== 'student name'
                    || strtolower($header[1] ?? '') !== 'class'
                    || strtolower($header[2] ?? '') !== 'transport fee'
                ) {
                    $result['errors'][] = 'TransportFees sheet must have headers: Student Name, Class, Transport Fee, [Student Email (optional)].';
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
                            $result['errors'][] = sprintf('TransportFees row %d: Class "%s" not found.', $index + 2, $className);

                            continue;
                        }

                        $query = User::where('name', $studentName)->where('class_id', $class->id);

                        if ($email !== '') {
                            $query->where('email', $email);
                        }

                        $users = $query->get();

                        if ($users->isEmpty()) {
                            $result['errors'][] = sprintf('TransportFees row %d: Student "%s" in class "%s" not found.', $index + 2, $studentName, $className);
                            $key = $studentName.'|'.$className;
                            if (! in_array($key, $notFoundKeys, true)) {
                                $notFoundKeys[] = $key;
                                $result['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                            }

                            continue;
                        }

                        if ($users->count() > 1) {
                            $result['errors'][] = sprintf('TransportFees row %d: Multiple students named "%s" in class "%s". Please specify Student Email.', $index + 2, $studentName, $className);

                            continue;
                        }

                        /** @var \App\Models\User $user */
                        $user = $users->first();
                        $user->transport_fee = (float) $fee;
                        $user->save();
                        $result['updated_transport']++;
                    }
                }
            }

            if (isset($sheets[2]) && is_array($sheets[2]) && count($sheets[2]) > 1) {
                $activityRows = $sheets[2];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($activityRows));

                if (strtolower($header[0] ?? '') !== 'activity name' || strtolower($header[1] ?? '') !== 'price') {
                    $result['errors'][] = 'Activities sheet must have headers: Activity Name, Price';
                } else {
                    foreach ($activityRows as $index => $row) {
                        $name = trim((string) ($row[0] ?? ''));
                        $price = (string) ($row[1] ?? '');

                        if ($name === '' || $price === '') {
                            continue;
                        }

                        ExtracurricularActivity::updateOrCreate(
                            ['name' => $name],
                            [
                                'price' => (float) $price,
                                'is_active' => true,
                            ],
                        );
                        $result['activities_upserted']++;
                    }
                }
            }

            if (isset($sheets[3]) && is_array($sheets[3]) && count($sheets[3]) > 1) {
                $studentActivitiesRows = $sheets[3];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($studentActivitiesRows));

                if (
                    strtolower($header[0] ?? '') !== 'student name'
                    || strtolower($header[1] ?? '') !== 'class'
                ) {
                    $result['errors'][] = 'StudentActivities sheet must start with headers: Student Name, Class, followed by activity columns (e.g. Skating, Chess, ...).';
                } else {
                    $activityColumns = [];
                    $activityHeaderDebug = [];

                    foreach ($header as $index => $col) {
                        if ($index < 2) {
                            continue;
                        }

                        if ($col === '') {
                            continue;
                        }

                        $activityHeaderDebug[] = $col;
                        $activity = ExtracurricularActivity::where('name', $col)->first();
                        if (! $activity) {
                            $result['errors'][] = sprintf('StudentActivities: Activity "%s" (column %d) not found in Activities sheet.', $col, $index + 1);

                            continue;
                        }

                        $activityColumns[$index] = $activity->id;
                    }

                    if (count($activityColumns) === 0 && count($activityHeaderDebug) > 0) {
                        $result['errors'][] = sprintf('StudentActivities: Found %d activity columns (%s) but none matched activities in database. Make sure activity names match exactly.', count($activityHeaderDebug), implode(', ', $activityHeaderDebug));
                    }

                    StudentActivity::where('academic_term_id', $term->id)->delete();

                    $processedRows = 0;
                    $skippedDueToNoYes = 0;

                    foreach ($studentActivitiesRows as $index => $row) {
                        $studentName = trim((string) ($row[0] ?? ''));
                        $className = trim((string) ($row[1] ?? ''));

                        if ($studentName === '' || $className === '') {
                            continue;
                        }

                        $processedRows++;

                        $class = SchoolClass::where('name', $className)->first();
                        if (! $class) {
                            $result['errors'][] = sprintf('StudentActivities row %d: Class "%s" not found.', $index + 2, $className);

                            continue;
                        }

                        $users = User::where('name', $studentName)
                            ->where('class_id', $class->id)
                            ->get();

                        if ($users->isEmpty()) {
                            $result['errors'][] = sprintf('StudentActivities row %d: Student "%s" in class "%s" not found.', $index + 2, $studentName, $className);
                            $key = $studentName.'|'.$className;
                            if (! in_array($key, $notFoundKeys, true)) {
                                $notFoundKeys[] = $key;
                                $result['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                            }

                            continue;
                        }

                        if ($users->count() > 1) {
                            $result['errors'][] = sprintf('StudentActivities row %d: Multiple students named "%s" in class "%s". Please disambiguate in the system first.', $index + 2, $studentName, $className);

                            continue;
                        }

                        /** @var \App\Models\User $user */
                        $user = $users->first();

                        $enrolledInAny = false;
                        foreach ($activityColumns as $colIndex => $activityId) {
                            $rawValue = strtolower(trim((string) ($row[$colIndex] ?? '')));

                            if ($rawValue !== 'yes') {
                                continue;
                            }

                            StudentActivity::create([
                                'user_id' => $user->id,
                                'extracurricular_activity_id' => $activityId,
                                'academic_term_id' => $term->id,
                                'is_enrolled' => true,
                            ]);

                            $result['student_activities_created']++;
                            $enrolledInAny = true;
                        }

                        if (! $enrolledInAny) {
                            $skippedDueToNoYes++;
                        }
                    }

                    if ($processedRows > 0 && $result['student_activities_created'] === 0 && $skippedDueToNoYes > 0) {
                        $result['errors'][] = sprintf('StudentActivities: Processed %d student rows but found no "yes" values in activity columns. Check that cells contain exactly "yes" (case-insensitive).', $processedRows);
                    }
                }
            }

            if (isset($sheets[4]) && is_array($sheets[4]) && count($sheets[4]) > 1) {
                $debitCreditRows = $sheets[4];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($debitCreditRows));

                if (
                    strtolower($header[0] ?? '') !== 'student name'
                    || strtolower($header[1] ?? '') !== 'class'
                    || strtolower($header[2] ?? '') !== 'debit balance'
                    || strtolower($header[3] ?? '') !== 'credit balance'
                ) {
                    $result['errors'][] = 'DebitCredit sheet must have headers: Student Name, Class, Debit Balance, Credit Balance';
                } else {
                    foreach ($debitCreditRows as $index => $row) {
                        $studentName = trim((string) ($row[0] ?? ''));
                        $className = trim((string) ($row[1] ?? ''));
                        $debitBalance = (string) ($row[2] ?? '0');
                        $creditBalance = (string) ($row[3] ?? '0');

                        if ($studentName === '' || $className === '') {
                            continue;
                        }

                        $class = SchoolClass::where('name', $className)->first();

                        if (! $class) {
                            $result['errors'][] = sprintf('DebitCredit row %d: Class "%s" not found.', $index + 2, $className);

                            continue;
                        }

                        $users = User::where('name', $studentName)
                            ->where('class_id', $class->id)
                            ->get();

                        if ($users->isEmpty()) {
                            $result['errors'][] = sprintf('DebitCredit row %d: Student "%s" in class "%s" not found.', $index + 2, $studentName, $className);
                            $key = $studentName.'|'.$className;
                            if (! in_array($key, $notFoundKeys, true)) {
                                $notFoundKeys[] = $key;
                                $result['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                            }

                            continue;
                        }

                        if ($users->count() > 1) {
                            $result['errors'][] = sprintf('DebitCredit row %d: Multiple students named "%s" in class "%s". Please disambiguate.', $index + 2, $studentName, $className);

                            continue;
                        }

                        /** @var \App\Models\User $user */
                        $user = $users->first();

                        StudentTermBalance::updateOrCreate(
                            [
                                'user_id' => $user->id,
                                'academic_term_id' => $term->id,
                            ],
                            [
                                'debit_balance' => (float) $debitBalance,
                                'credit_balance' => (float) $creditBalance,
                            ],
                        );

                        $result['debit_credit_updated']++;
                    }
                }
            }

            if (isset($sheets[5]) && is_array($sheets[5]) && count($sheets[5]) > 1) {
                $amountPaidRows = $sheets[5];
                $header = array_map(static fn ($v) => trim((string) $v), array_shift($amountPaidRows));

                if (
                    strtolower($header[0] ?? '') !== 'student name'
                    || strtolower($header[1] ?? '') !== 'class'
                    || strtolower($header[2] ?? '') !== 'amount paid'
                ) {
                    $result['errors'][] = 'AmountPaid sheet must have headers: Student Name, Class, Amount Paid';
                } else {
                    foreach ($amountPaidRows as $index => $row) {
                        $studentName = trim((string) ($row[0] ?? ''));
                        $className = trim((string) ($row[1] ?? ''));
                        $amountPaid = (string) ($row[2] ?? '0');

                        if ($studentName === '' || $className === '') {
                            continue;
                        }

                        $class = SchoolClass::where('name', $className)->first();

                        if (! $class) {
                            $result['errors'][] = sprintf('AmountPaid row %d: Class "%s" not found.', $index + 2, $className);

                            continue;
                        }

                        $users = User::where('name', $studentName)
                            ->where('class_id', $class->id)
                            ->get();

                        if ($users->isEmpty()) {
                            $result['errors'][] = sprintf('AmountPaid row %d: Student "%s" in class "%s" not found.', $index + 2, $studentName, $className);
                            $key = $studentName.'|'.$className;
                            if (! in_array($key, $notFoundKeys, true)) {
                                $notFoundKeys[] = $key;
                                $result['not_found_students'][] = ['name' => $studentName, 'class' => $className];
                            }

                            continue;
                        }

                        if ($users->count() > 1) {
                            $result['errors'][] = sprintf('AmountPaid row %d: Multiple students named "%s" in class "%s". Please disambiguate.', $index + 2, $studentName, $className);

                            continue;
                        }

                        /** @var \App\Models\User $user */
                        $user = $users->first();

                        StudentTermBalance::updateOrCreate(
                            [
                                'user_id' => $user->id,
                                'academic_term_id' => $term->id,
                            ],
                            [
                                'amount_paid' => (float) $amountPaid,
                            ],
                        );

                        $result['amount_paid_updated']++;
                    }
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            throw $e;
        }

        return $result;
    }
}
