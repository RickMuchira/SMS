<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bus extends Model
{
    /** @use HasFactory<\Database\Factories\BusFactory> */
    use HasFactory;

    protected $fillable = [
        'registration_number',
        'capacity',
        'status',
        'notes',
    ];

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }
}
