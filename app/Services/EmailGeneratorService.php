<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Str;

class EmailGeneratorService
{
    /**
     * Generate a unique email from a full name using system settings.
     *
     * Rules:
     * - Use email format from system settings (e.g., {firstname}.{lastname})
     * - Use domain from system settings
     * - Slugify and normalize
     * - If duplicate, append number (2, 3, etc.)
     */
    public static function generateFromName(string $fullName): string
    {
        $domain = SystemSetting::get('email_domain', config('school.email_domain', 'student.local'));
        $format = SystemSetting::get('email_format', '{firstname}.{lastname}');

        $parts = preg_split('/\s+/', trim($fullName), -1, PREG_SPLIT_NO_EMPTY);

        if (empty($parts)) {
            $parts = ['user'.rand(1000, 9999)];
        }

        $firstName = Str::slug($parts[0] ?? '');
        $lastName = Str::slug($parts[1] ?? '');
        $fullNameSlug = Str::slug(implode('', $parts));

        // Build email prefix based on format
        $prefix = match ($format) {
            '{firstname}.{lastname}' => $firstName.($lastName ? '.'.$lastName : ''),
            '{fullname}' => $fullNameSlug,
            '{firstname}{lastname}' => $firstName.$lastName,
            '{firstname}' => $firstName,
            default => $firstName.($lastName ? '.'.$lastName : ''),
        };

        if (empty($prefix)) {
            $prefix = 'user'.rand(1000, 9999);
        }

        $baseEmail = $prefix.'@'.$domain;

        if (! User::where('email', $baseEmail)->exists()) {
            return $baseEmail;
        }

        // Handle duplicates
        $counter = 2;
        while (User::where('email', $prefix.$counter.'@'.$domain)->exists()) {
            $counter++;
        }

        return $prefix.$counter.'@'.$domain;
    }
}
