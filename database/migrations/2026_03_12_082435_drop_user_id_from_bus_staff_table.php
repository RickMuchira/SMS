<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('bus_staff', 'user_id')) {
            // Drop any unique index that still references user_id (SQLite requires this).
            DB::statement('DROP INDEX IF EXISTS bus_staff_bus_id_user_id_unique');

            Schema::table('bus_staff', function (Blueprint $table): void {
                $table->dropColumn('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('bus_staff', function (Blueprint $table): void {
            if (! Schema::hasColumn('bus_staff', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable();
            }
        });
    }
};
