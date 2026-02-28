<?php

namespace App\Services;

class ResultTemplateService
{
    /**
     * Grade templates: grade_code => [Student Name, subject headers].
     * Subject headers map to canonical subject codes during import.
     */
    protected static array $templates = [
        'PP1' => ['Student Name', 'Math', 'Language', 'ENV', 'Creative'],
        'PP2' => ['Student Name', 'Language', 'N/W', 'Literacy', 'Inter', 'Art'],
        'G1' => ['Student Name', 'Math', 'English', 'Kiswahili', 'Environment'],
        'G2' => ['Student Name', 'ENV', 'CRE', 'Creative', 'Math', 'Eng', 'Kisw'],
        'G3' => ['Student Name', 'Math', 'Eng', 'Kisw', 'ENV', 'CRE', 'C/A'],
        'G4' => ['Student Name', 'Math', 'Eng', 'Kisw', 'C/A', 'CRE', 'ENV'],
        'G5' => ['Student Name', 'ENG', 'KISW', 'MATH', 'S/T', 'CRE', 'AGRI', 'SST', 'C.A'],
        'G6' => ['Student Name', 'Math', 'Eng', 'Kisw', 'Agri', 'CRE', 'SST', 'S/T', 'CA'],
    ];

    /**
     * Extract grade_code from class name (e.g. PP1Red -> PP1, G2Green -> G2).
     */
    public static function gradeCodeFromClassName(string $className): ?string
    {
        $upper = strtoupper(trim($className));
        foreach (array_keys(self::$templates) as $code) {
            $codeUpper = strtoupper($code);
            if (str_starts_with($upper, $codeUpper)) {
                return $code;
            }
        }
        // Fallback: try common patterns
        if (preg_match('/^(PP[12]|G[1-6])/i', $upper, $m)) {
            return strtoupper($m[1]);
        }

        return null;
    }

    /**
     * Get template headers for a grade_code.
     */
    public static function getHeaders(string $gradeCode): array
    {
        $code = strtoupper($gradeCode);

        return self::$templates[$code] ?? [];
    }

    /**
     * Normalize header string for matching (lowercase, trim, collapse spaces).
     */
    public static function normalizeHeader(string $header): string
    {
        return strtolower(trim(preg_replace('/\s+/', '', $header)));
    }

    /**
     * Map raw header to canonical subject code.
     * Uses config and Subject model aliases during import.
     */
    public static function headerToSubjectCode(string $header): ?string
    {
        $norm = self::normalizeHeader($header);
        $aliases = [
            'studentname' => null,
            'math' => 'math',
            'language' => 'language',
            'env' => 'env',
            'creative' => 'creative',
            'n/w' => 'literacy',  // N/W often used for Literacy
            'literacy' => 'literacy',
            'inter' => 'inter',
            'art' => 'art',
            'english' => 'english',
            'eng' => 'english',
            'kiswahili' => 'kiswahili',
            'kisw' => 'kiswahili',
            'environment' => 'env',
            'cre' => 'cre',
            'c/a' => 'ca',
            'ca' => 'ca',
            's/t' => 'st',
            'st' => 'st',
            'agri' => 'agri',
            'sst' => 'sst',
        ];

        return $aliases[$norm] ?? null;
    }
}
