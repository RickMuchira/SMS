<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Trip extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'trip_number',
        'driver_id',
        'assistant_id',
        'departure_time',
        'status',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function assistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assistant_id');
    }

    public function studentTransports(): HasMany
    {
        return $this->hasMany(StudentTransport::class, 'morning_trip_id');
    }

    public function tracking(): HasOne
    {
        return $this->hasOne(TripTracking::class);
    }
}
