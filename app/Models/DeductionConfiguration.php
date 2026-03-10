<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeductionConfiguration extends Model
{
    protected $fillable = [
        'name',
        'code',
        'type',
        'parameters',
        'is_active',
        'effective_from',
        'effective_to',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'parameters' => 'array',
            'is_active' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('effective_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            });
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
