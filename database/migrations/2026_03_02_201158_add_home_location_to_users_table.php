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
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('home_latitude', 10, 7)->nullable()->after('extra_guardians');
            $table->decimal('home_longitude', 10, 7)->nullable()->after('home_latitude');
            $table->text('home_address')->nullable()->after('home_longitude');
            $table->text('pickup_notes')->nullable()->after('home_address');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['home_latitude', 'home_longitude', 'home_address', 'pickup_notes']);
        });
    }
};
