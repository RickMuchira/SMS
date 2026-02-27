<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExtracurricularActivity extends Model
{
    /**
     * Allow mass assignment for all attributes.
     *
     * This model is used by the fee import to upsert activities.
     *
     * @var array<int, string>
     */
    protected $guarded = [];
}
