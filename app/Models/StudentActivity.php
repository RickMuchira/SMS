<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentActivity extends Model
{
    /**
     * Allow mass assignment for all attributes.
     *
     * This model is created in bulk during fee imports.
     *
     * @var array<int, string>
     */
    protected $guarded = [];
}
