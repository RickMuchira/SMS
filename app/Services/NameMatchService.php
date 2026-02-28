<?php

namespace App\Services;

class NameMatchService
{
    /**
     * Normalize name for comparison (lowercase, trim, collapse spaces).
     */
    public function normalize(string $name): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    /**
     * Calculate similarity percentage using similar_text.
     */
    public function similarity(string $a, string $b): float
    {
        $a = $this->normalize($a);
        $b = $this->normalize($b);

        if ($a === $b) {
            return 100.0;
        }

        if ($a === '' || $b === '') {
            return 0.0;
        }

        similar_text($a, $b, $percent);

        return (float) $percent;
    }

    /**
     * Levenshtein-based similarity (0–100).
     * Better for typos and short strings.
     */
    public function levenshteinSimilarity(string $a, string $b): float
    {
        $a = $this->normalize($a);
        $b = $this->normalize($b);

        if ($a === $b) {
            return 100.0;
        }

        if ($a === '' || $b === '') {
            return 0.0;
        }

        $distance = levenshtein($a, $b);
        $maxLen = max(strlen($a), strlen($b));

        if ($maxLen === 0) {
            return 100.0;
        }

        return max(0, 100 - (100 * $distance / $maxLen));
    }

    /**
     * Combined score: similar_text (70%) + levenshtein (30%).
     */
    public function combinedSimilarity(string $a, string $b): float
    {
        $st = $this->similarity($a, $b);
        $lv = $this->levenshteinSimilarity($a, $b);

        return $st * 0.7 + $lv * 0.3;
    }

    /**
     * Find best matching student from candidates.
     *
     * @param  array<string, mixed>  $candidates  Array of ['id' => int, 'name' => string] or User models
     * @return array{user_id: int|null, name: string, similarity: float, suggestions: array}
     */
    public function findBestMatch(string $inputName, iterable $candidates, float $threshold = 85.0): array
    {
        $inputNorm = $this->normalize($inputName);
        $best = null;
        $bestScore = 0.0;
        $suggestions = [];

        foreach ($candidates as $c) {
            $name = $c['name'] ?? $c->name ?? '';
            $id = $c['id'] ?? $c->id ?? null;

            if ($name === '' || $id === null) {
                continue;
            }

            $score = $this->combinedSimilarity($inputName, $name);

            if ($inputNorm === $this->normalize($name)) {
                return [
                    'user_id' => $id,
                    'name' => $name,
                    'similarity' => 100.0,
                    'suggestions' => [],
                ];
            }

            if ($score >= $threshold) {
                $suggestions[] = [
                    'user_id' => $id,
                    'name' => $name,
                    'similarity' => round($score, 2),
                ];
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = [
                    'user_id' => $id,
                    'name' => $name,
                    'similarity' => round($score, 2),
                ];
            }
        }

        usort($suggestions, fn ($x, $y) => $y['similarity'] <=> $x['similarity']);

        return [
            'user_id' => $bestScore >= $threshold ? ($best['user_id'] ?? null) : null,
            'name' => $best['name'] ?? '',
            'similarity' => $bestScore,
            'suggestions' => array_slice($suggestions, 0, 5),
        ];
    }
}
