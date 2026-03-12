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
        Schema::table('buses', function (Blueprint $table) {
            $table->foreignId('driver_id')->nullable()->after('notes')->constrained('users')->onDelete('set null');
            $table->foreignId('assistant_id')->nullable()->after('driver_id')->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropForeign(['driver_id']);
            $table->dropForeign(['assistant_id']);
        });
    }
};
