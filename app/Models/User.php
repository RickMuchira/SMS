<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens;

    use HasFactory;
    use HasRoles;
    use Notifiable;
    use TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'class_id',
        'guardian_name',
        'guardian_phone',
        'guardian_relationship',
        'extra_guardians',
        'home_latitude',
        'home_longitude',
        'home_address',
        'pickup_notes',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'extra_guardians' => 'array',
        ];
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function fees(): HasMany
    {
        return $this->hasMany(StudentFee::class);
    }

    public function termBalances(): HasMany
    {
        return $this->hasMany(StudentTermBalance::class);
    }

    public function academicResults(): HasMany
    {
        return $this->hasMany(AcademicResult::class);
    }

    public function getTotalFeesAttribute(): float
    {
        return (float) $this->fees()->sum('amount');
    }

    public function getTotalPaidAttribute(): float
    {
        return (float) $this->fees()->sum('amount_paid');
    }

    public function getTotalBalanceAttribute(): float
    {
        return $this->total_fees - $this->total_paid;
    }

    public function staffProfile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function tripStops(): HasMany
    {
        return $this->hasMany(TripStop::class, 'student_id');
    }

    public function assignedBus(): HasOne
    {
        return $this->hasOne(StudentTransport::class, 'student_id');
    }
}
