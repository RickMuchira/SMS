<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->foreignId('bus_id')->nullable()->after('id')->constrained('buses')->onDelete('set null');
            $table->date('trip_date')->nullable()->after('type');
            $table->time('start_time')->nullable()->after('trip_date');
            $table->time('end_time')->nullable()->after('start_time');
            $table->enum('status', ['planned', 'in_progress', 'completed', 'cancelled'])->default('planned')->change();
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropForeign(['bus_id']);
            $table->dropColumn(['bus_id', 'trip_date', 'start_time', 'end_time']);
            $table->enum('status', ['active', 'inactive'])->default('active')->change();
        });
    }
};
