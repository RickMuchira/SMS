<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentTermBalance extends Model
{
    protected $fillable = [
        'user_id',
        'academic_term_id',
        'debit_balance',
        'credit_balance',
        'amount_paid',
    ];

    protected function casts(): array
    {
        return [
            'debit_balance' => 'decimal:2',
            'credit_balance' => 'decimal:2',
            'amount_paid' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }
}
