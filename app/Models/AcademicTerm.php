<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicTerm extends Model
{
    /**
     * The attributes that aren't mass assignable.
     *
     * We guard nothing here because this model is only written
     * to by trusted application code (migrations, seeders, imports).
     *
     * @var array<int, string>
     */
    protected $guarded = [];
}
