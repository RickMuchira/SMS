<?php

namespace App\Services;

use App\Models\AcademicResult;
use App\Models\AcademicTerm;
use App\Models\SchoolClass;
use App\Models\Subject;

class ResultImportService
{
    public function __construct(
        protected NameMatchService $nameMatch,
        protected ResultTemplateService $template
    ) {}

    /**
     * Preview import: parse rows, match students, report unmatched and missing.
     *
     * @param  array<int, array<string>>  $rows  [['Student Name', 'Math', ...], ['John Doe', '85', ...], ...]
     * @return array{matched: array, unmatched: array, missing: array, errors: array}
     */
    public function preview(
        SchoolClass $schoolClass,
        AcademicTerm $term,
        array $rows
    ): array {
        $students = $schoolClass->students()->get()->keyBy('id');
        $rawHeaders = array_shift($rows) ?? [];
        $subjectCodes = $this->mapHeadersToSubjects($rawHeaders);
        $subjectsById = Subject::whereIn('code', array_values(array_filter($subjectCodes)))->get()->keyBy('code');
        $studentHeader = $this->findStudentNameHeader($rawHeaders);

        $matched = [];
        $unmatched = [];
        $lineNumber = 1;

        foreach ($rows as $row) {
            $lineNumber++;
            $rowData = $this->rowToAssoc($rawHeaders, $row);
            $studentNameRaw = trim((string) ($rowData[$studentHeader] ?? $rowData[0] ?? ''));

            if ($studentNameRaw === '') {
                continue;
            }

            $result = $this->nameMatch->findBestMatch($studentNameRaw, $students, 85.0);

            if ($result['user_id'] !== null) {
                $student = $students->get($result['user_id']);
                $matched[] = [
                    'line' => $lineNumber,
                    'input_name' => $studentNameRaw,
                    'user_id' => $result['user_id'],
                    'name' => $student?->name ?? '',
                    'similarity' => $result['similarity'],
                    'scores' => $this->extractScores($rowData, $subjectCodes),
                ];
            } else {
                $unmatched[] = [
                    'line' => $lineNumber,
                    'input_name' => $studentNameRaw,
                    'suggestions' => $result['suggestions'],
                    'scores' => $this->extractScores($rowData, $subjectCodes),
                ];
            }
        }

        $matchedUserIds = collect($matched)->pluck('user_id')->unique()->values();
        $missing = $students->whereNotIn('id', $matchedUserIds)->values()->map(fn ($u) => [
            'user_id' => $u->id,
            'name' => $u->name,
        ])->all();

        return [
            'matched' => $matched,
            'unmatched' => $unmatched,
            'missing' => $missing,
            'subject_codes' => $subjectCodes,
            'subjects' => $subjectsById->keyBy('code')->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
        ];
    }

    /**
     * Perform import using confirmed matches.
     *
     * @param  array<int, array{user_id: int, scores: array<string, string>}>  $confirmedRows
     */
    public function import(
        SchoolClass $schoolClass,
        AcademicTerm $term,
        array $confirmedRows
    ): array {
        $created = 0;
        $updated = 0;
        $errors = [];

        $subjects = Subject::whereIn('code', $this->allSubjectCodes())->get()->keyBy('code');

        foreach ($confirmedRows as $row) {
            $userId = $row['user_id'] ?? null;
            $scores = $row['scores'] ?? [];

            if (! $userId || empty($scores)) {
                continue;
            }

            foreach ($scores as $subjectCode => $scoreValue) {
                $subject = $subjects->get($subjectCode);

                if (! $subject) {
                    $errors[] = "Unknown subject: {$subjectCode}";

                    continue;
                }

                $result = AcademicResult::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'academic_term_id' => $term->id,
                        'subject_id' => $subject->id,
                    ],
                    [
                        'school_class_id' => $schoolClass->id,
                        'score' => $scoreValue,
                        'max_score' => '100',
                    ]
                );

                $result->wasRecentlyCreated ? $created++ : $updated++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'errors' => $errors,
        ];
    }

    /**
     * Map first row (headers) to subject codes.
     *
     * @param  array<int, string>  $rawHeaders
     * @return array<string, string> header => subject_code
     */
    protected function mapHeadersToSubjects(array $rawHeaders): array
    {
        $mapped = [];

        foreach ($rawHeaders as $i => $h) {
            $header = trim((string) $h);
            $norm = ResultTemplateService::normalizeHeader($header);
            $code = ResultTemplateService::headerToSubjectCode($norm);

            if ($code !== null) {
                $mapped[$header] = $code;
            } elseif (str_contains($norm, 'student') || str_contains($norm, 'name')) {
                $mapped[$header] = 'student_name';
            }
        }

        return $mapped;
    }

    /**
     * Find header key used for student name.
     */
    protected function findStudentNameHeader(array $rawHeaders): ?string
    {
        foreach ($rawHeaders as $h) {
            $norm = ResultTemplateService::normalizeHeader((string) $h);
            if (str_contains($norm, 'student') || ($norm === 'name')) {
                return $h;
            }
        }

        return $rawHeaders[0] ?? null;
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, string>  $row
     * @return array<string, string>
     */
    protected function rowToAssoc(array $headers, array $row): array
    {
        $padded = array_pad(array_map(fn ($v) => is_scalar($v) ? trim((string) $v) : '', $row), count($headers), '');

        return array_combine($headers, array_slice($padded, 0, count($headers))) ?: [];
    }

    /**
     * @param  array<string, string>  $rowData
     * @param  array<string, string>  $subjectCodes
     * @return array<string, string>
     */
    protected function extractScores(array $rowData, array $subjectCodes): array
    {
        $scores = [];

        foreach ($subjectCodes as $header => $code) {
            if ($code === 'student_name') {
                continue;
            }

            $val = trim((string) ($rowData[$header] ?? ''));
            if ($val !== '') {
                $scores[$code] = $val;
            }
        }

        return $scores;
    }

    protected function allSubjectCodes(): array
    {
        return [
            'math', 'language', 'env', 'creative', 'literacy', 'inter', 'art',
            'english', 'kiswahili', 'cre', 'ca', 'st', 'agri', 'sst',
        ];
    }
}
