<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripStop extends Model
{
    /** @use HasFactory<\Database\Factories\TripStopFactory> */
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'student_id',
        'order_sequence',
        'latitude',
        'longitude',
        'address',
        'pickup_notes',
        'status',
        'status_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'status_updated_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
