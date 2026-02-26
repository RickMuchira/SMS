<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentTransport extends Model
{
    use HasFactory;

    protected $table = 'student_transport';

    protected $fillable = [
        'student_id',
        'uses_transport',
        'morning_trip_id',
        'evening_trip_id',
        'pickup_location_id',
        'dropoff_location_id',
        'notes',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function morningTrip(): BelongsTo
    {
        return $this->belongsTo(Trip::class, 'morning_trip_id');
    }

    public function eveningTrip(): BelongsTo
    {
        return $this->belongsTo(Trip::class, 'evening_trip_id');
    }

    public function pickupLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'pickup_location_id');
    }

    public function dropoffLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'dropoff_location_id');
    }
}
